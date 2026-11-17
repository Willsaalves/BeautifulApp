# Imagem da API para a AWS (ECS Fargate). Build: docker build -t beautifulapp-api ./backend

# ---- 1. compila ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew --no-daemon -q dependencies > /dev/null
COPY src src
RUN ./gradlew --no-daemon -q bootJar -x test \
 && cp "$(ls build/libs/*.jar | grep -v plain)" app.jar \
 && java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

# ---- 2. roda ----
FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 --create-home app
WORKDIR /app
# camadas do Spring Boot: dependências mudam pouco, então o push de uma nova versão envia só a última camada
COPY --from=build /src/extracted/dependencies/ ./
COPY --from=build /src/extracted/spring-boot-loader/ ./
COPY --from=build /src/extracted/snapshot-dependencies/ ./
COPY --from=build /src/extracted/application/ ./
USER app
EXPOSE 8080
# usa até 75% da memória da task; o restante fica para o sistema
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s CMD curl -fsS http://localhost:8080/actuator/health/liveness || exit 1
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
