plugins {
    kotlin("jvm") version "2.2.20"
    kotlin("plugin.dataframe") version "2.2.20"
    id("application")
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "org.example"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(kotlin("test"))
    // https://stackoverflow.com/questions/54652836/found-slf4j-api-dependency-but-no-providers-were-found
    implementation("org.slf4j:slf4j-nop:2.0.7")
    // for date
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.7.1")
    implementation("org.jetbrains.kotlinx:dataframe:1.0.0-Beta3")
}

tasks.test {
    useJUnitPlatform()
}
tasks.named<JavaExec>("run") {
    standardInput = System.`in`
}
tasks.shadowJar {
    archiveBaseName.set("MCO2_4_Kotlin")
    archiveClassifier.set("")
    archiveVersion.set("1.0-SNAPSHOT")
    manifest {
        attributes["Main-Class"] = "MainKt"
    }
}
kotlin {
    jvmToolchain(21)
}
application {
    mainClass.set("MCO2_4_KotlinKt")
}
