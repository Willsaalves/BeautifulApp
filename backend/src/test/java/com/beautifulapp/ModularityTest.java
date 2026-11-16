package com.beautifulapp;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/** Garante que nenhum módulo usa classes internas de outro (fronteiras do monólito modular). */
class ModularityTest {
    static final ApplicationModules modules = ApplicationModules.of(BeautifulApplication.class);

    @Test
    void verifiesModuleBoundaries() {
        modules.verify();
    }

    @Test
    void writesModuleDocs() {
        new Documenter(modules).writeModulesAsPlantUml().writeIndividualModulesAsPlantUml();
    }
}
