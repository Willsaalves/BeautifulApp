package com.beautifulapp.page.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface PageWidgetRepository extends JpaRepository<PageWidget, UUID> {
    List<PageWidget> findByProfessionalIdOrderByPosition(UUID professionalId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from PageWidget w where w.professionalId = :pro")
    void deleteAllOf(UUID pro);
}
