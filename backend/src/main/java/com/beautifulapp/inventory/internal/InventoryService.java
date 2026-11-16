package com.beautifulapp.inventory.internal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.beautifulapp.catalog.CatalogApi;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.AppointmentCompleted;
import com.beautifulapp.common.Ids;
import com.beautifulapp.inventory.internal.InventoryDtos.*;

@Service
class InventoryService {
    private final ProductRepository products;
    private final StockMovementRepository movements;
    private final ConsumptionRepository consumption;
    private final CatalogApi catalog;
    private final Clock clock;

    InventoryService(ProductRepository products, StockMovementRepository movements, ConsumptionRepository consumption, CatalogApi catalog, Clock clock) {
        this.products = products;
        this.movements = movements;
        this.consumption = consumption;
        this.catalog = catalog;
        this.clock = clock;
    }

    // ---------- produtos ----------

    @Transactional(readOnly = true)
    List<ProductView> list(UUID pro) {
        return products.findByProfessionalIdAndActiveTrueOrderByName(pro).stream().map(InventoryService::view).toList();
    }

    @Transactional
    ProductView create(UUID pro, ProductInput in) {
        Product p = new Product(Ids.newId(), pro, clock.instant());
        apply(p, in);
        return view(products.save(p));
    }

    @Transactional
    ProductView update(UUID pro, UUID id, ProductInput in) {
        Product p = own(pro, id);
        apply(p, in);
        return view(p);
    }

    @Transactional
    void deactivate(UUID pro, UUID id) {
        own(pro, id).active = false;
    }

    /** "Comprei 150 pincéis": entrada no estoque + custo médio ponderado. */
    @Transactional
    ProductView purchase(UUID pro, UUID id, PurchaseInput in) {
        own(pro, id);
        Product p = products.lockById(id).orElseThrow();
        BigDecimal qty = BigDecimal.valueOf(in.quantity());
        if (in.unitCostCents() != null) {
            BigDecimal cost = BigDecimal.valueOf(in.unitCostCents());
            BigDecimal current = p.quantity.max(BigDecimal.ZERO);
            p.avgCostCents = p.avgCostCents == null || current.signum() == 0
                    ? cost
                    : p.avgCostCents.multiply(current).add(cost.multiply(qty)).divide(current.add(qty), 4, RoundingMode.HALF_UP);
        }
        p.quantity = p.quantity.add(qty);
        if (StringUtils.hasText(in.lot())) p.lot = in.lot().trim();
        if (in.expiresAt() != null) p.expiresAt = in.expiresAt();
        movements.save(new StockMovement(Ids.newId(), id, qty, Reason.PURCHASE,
                in.unitCostCents() == null ? null : BigDecimal.valueOf(in.unitCostCents()), null, null, clock.instant()));
        return view(p);
    }

    /** Ajuste manual (perda, contagem). */
    @Transactional
    ProductView adjust(UUID pro, UUID id, AdjustInput in) {
        own(pro, id);
        Product p = products.lockById(id).orElseThrow();
        BigDecimal delta = BigDecimal.valueOf(in.delta());
        p.quantity = p.quantity.add(delta).max(BigDecimal.ZERO);
        movements.save(new StockMovement(Ids.newId(), id, delta, Reason.ADJUSTMENT, null, null, in.note(), clock.instant()));
        return view(p);
    }

    @Transactional(readOnly = true)
    List<MovementView> movements(UUID pro, int limit) {
        Map<UUID, Product> mine = products.findByProfessionalIdAndActiveTrueOrderByName(pro).stream()
                .collect(Collectors.toMap(p -> p.id, Function.identity()));
        if (mine.isEmpty()) return List.of();
        return movements.recent(mine.keySet(), PageRequest.of(0, Math.min(Math.max(limit, 1), 200))).stream()
                .map(m -> new MovementView(m.id, m.productId, mine.get(m.productId).name, m.delta.doubleValue(), m.reason,
                        m.unitCostCents == null ? null : m.unitCostCents.doubleValue(), m.appointmentId, m.note, m.createdAt))
                .toList();
    }

    // ---------- consumo por serviço ----------

    @Transactional(readOnly = true)
    List<ConsumptionView> consumptionOf(UUID pro) {
        List<UUID> serviceIds = catalog.activeServices(pro).stream().map(s -> s.id()).toList();
        return consumption.findByServiceIdIn(serviceIds).stream()
                .map(c -> new ConsumptionView(c.serviceId, c.productId, c.amount.doubleValue())).toList();
    }

    @Transactional
    List<ConsumptionView> setConsumption(UUID pro, UUID serviceId, List<ConsumptionInput> in) {
        catalog.activeService(serviceId).filter(s -> s.professionalId().equals(pro))
                .orElseThrow(() -> ApiException.notFound("SERVICE_NOT_FOUND", "Serviço não encontrado."));
        if (in.stream().map(ConsumptionInput::productId).distinct().count() != in.size()) {
            throw ApiException.badRequest("CONSUMPTION_DUPLICATED", "Cada produto só pode aparecer uma vez.");
        }
        in.forEach(c -> own(pro, c.productId()));
        consumption.deleteAllOf(serviceId);
        in.forEach(c -> consumption.save(new ServiceConsumption(serviceId, c.productId(), BigDecimal.valueOf(c.amount()))));
        return consumption.findByServiceId(serviceId).stream()
                .map(c -> new ConsumptionView(c.serviceId, c.productId, c.amount.doubleValue())).toList();
    }

    // ---------- baixa automática ----------

    /** Na mesma transação da conclusão: se a baixa falhar, a conclusão também volta. Idempotente por (produto, atendimento). */
    @EventListener
    @Transactional
    public void onCompleted(AppointmentCompleted e) {
        for (ServiceConsumption c : consumption.findByServiceId(e.serviceId())) {
            if (movements.existsByProductIdAndAppointmentIdAndReason(c.productId, e.appointmentId(), Reason.ATTENDANCE)) continue;
            Product p = products.lockById(c.productId).orElse(null);
            if (p == null || !p.active) continue;
            p.quantity = p.quantity.subtract(c.amount).max(BigDecimal.ZERO);
            movements.save(new StockMovement(Ids.newId(), p.id, c.amount.negate(), Reason.ATTENDANCE, p.avgCostCents, e.appointmentId(), null, clock.instant()));
        }
    }

    private void apply(Product p, ProductInput in) {
        p.name = in.name().trim();
        p.unit = in.unit();
        p.minQuantity = BigDecimal.valueOf(in.minQuantity());
        p.lot = StringUtils.hasText(in.lot()) ? in.lot().trim() : null;
        p.expiresAt = in.expiresAt();
    }

    private Product own(UUID pro, UUID id) {
        return products.findById(id).filter(p -> p.professionalId.equals(pro) && p.active)
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado."));
    }

    static ProductView view(Product p) {
        return new ProductView(p.id, p.name, p.unit, p.quantity.doubleValue(), p.minQuantity.doubleValue(),
                p.avgCostCents == null ? null : p.avgCostCents.doubleValue(), p.lot, p.expiresAt,
                p.quantity.compareTo(p.minQuantity) <= 0);
    }
}
