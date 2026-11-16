package com.beautifulapp.scheduling;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import org.junit.jupiter.api.Test;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;

/** Regras da arquitetura hexagonal do módulo de agendamento: quebrar uma delas falha o build. */
class SchedulingArchitectureTest {
    static final String BASE = "com.beautifulapp.scheduling";
    static final JavaClasses CLASSES = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS).importPackages(BASE);

    @Test
    void domainIsPureJava() {
        classes().that().resideInAPackage(BASE + ".domain..")
                .should().onlyDependOnClassesThat().resideInAnyPackage("java..", BASE + ".domain..")
                .because("o domínio não conhece Spring, JPA, HTTP nem outros módulos")
                .check(CLASSES);
    }

    @Test
    void applicationDoesNotKnowAdapters() {
        noClasses().that().resideInAPackage(BASE + ".application..")
                .should().dependOnClassesThat().resideInAnyPackage(BASE + ".adapter..", "jakarta.persistence..", "org.springframework.web..",
                        "org.springframework.data..", "org.springframework.jdbc..", "org.springframework.context..")
                .because("a aplicação fala com o mundo só pelas portas")
                .check(CLASSES);
    }

    @Test
    void applicationDoesNotCallOtherModulesDirectly() {
        noClasses().that().resideInAPackage(BASE + ".application..")
                .should().dependOnClassesThat().resideInAnyPackage("com.beautifulapp.catalog..", "com.beautifulapp.profile..",
                        "com.beautifulapp.media..", "com.beautifulapp.loyalty..", "com.beautifulapp.moderation..", "com.beautifulapp.notification..")
                .because("outros módulos entram pelos adaptadores de saída (portas ServiceCatalog, Participants, Files, Vouchers, BlockList)")
                .check(CLASSES);
    }

    @Test
    void inboundAndOutboundAdaptersAreIndependent() {
        noClasses().that().resideInAPackage(BASE + ".adapter.in..")
                .should().dependOnClassesThat().resideInAPackage(BASE + ".adapter.out..").check(CLASSES);
        noClasses().that().resideInAPackage(BASE + ".adapter.out..")
                .should().dependOnClassesThat().resideInAPackage(BASE + ".adapter.in..").check(CLASSES);
    }

    @Test
    void inboundAdaptersUseOnlyInputPorts() {
        noClasses().that().resideInAPackage(BASE + ".adapter.in..")
                .should().dependOnClassesThat().resideInAnyPackage(BASE + ".application.service..", BASE + ".application.port.out..")
                .because("quem chama o módulo usa os casos de uso, não a implementação")
                .check(CLASSES);
    }
}
