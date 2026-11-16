package com.beautifulapp.inventory.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.inventory.internal.InventoryDtos.*;
import com.beautifulapp.profile.ProfileApi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/me")
@Tag(name = "inventory", description = "Estoque da profissional logada")
class InventoryController {
    private final InventoryService inventory;
    private final ProfileApi profiles;

    InventoryController(InventoryService inventory, ProfileApi profiles) {
        this.inventory = inventory;
        this.profiles = profiles;
    }

    private UUID pro() { return profiles.requireProfessionalId(CurrentAccount.id()); }

    @Operation(summary = "Meus produtos (low = no mínimo ou abaixo)")
    @GetMapping("/products")
    List<ProductView> list() { return inventory.list(pro()); }

    @Operation(summary = "Cadastrar produto")
    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    ProductView create(@Valid @RequestBody ProductInput body) { return inventory.create(pro(), body); }

    @Operation(summary = "Editar produto")
    @PutMapping("/products/{id}")
    ProductView update(@PathVariable UUID id, @Valid @RequestBody ProductInput body) { return inventory.update(pro(), id, body); }

    @Operation(summary = "Remover produto")
    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) { inventory.deactivate(pro(), id); }

    @Operation(summary = "Registrar compra (entrada + custo médio)")
    @PostMapping("/products/{id}/purchases")
    ProductView purchase(@PathVariable UUID id, @Valid @RequestBody PurchaseInput body) { return inventory.purchase(pro(), id, body); }

    @Operation(summary = "Ajuste manual (perda, contagem)")
    @PostMapping("/products/{id}/adjustments")
    ProductView adjust(@PathVariable UUID id, @Valid @RequestBody AdjustInput body) { return inventory.adjust(pro(), id, body); }

    @Operation(summary = "Últimas movimentações")
    @GetMapping("/stock-movements")
    List<MovementView> movements(@RequestParam(defaultValue = "30") int limit) { return inventory.movements(pro(), limit); }

    @Operation(summary = "Consumo por atendimento de todos os meus serviços")
    @GetMapping("/consumption")
    List<ConsumptionView> consumption() { return inventory.consumptionOf(pro()); }

    @Operation(summary = "Define o consumo de um serviço (substitui a lista)")
    @PutMapping("/services/{serviceId}/consumption")
    List<ConsumptionView> setConsumption(@PathVariable UUID serviceId, @RequestBody List<@Valid ConsumptionInput> body) {
        return inventory.setConsumption(pro(), serviceId, body);
    }
}
