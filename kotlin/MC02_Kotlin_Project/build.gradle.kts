plugins {
    kotlin("jvm") version "2.2.20"
    kotlin("plugin.dataframe") version "2.2.20"
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
    implementation("org.jetbrains.kotlinx:dataframe:1.0.0-Beta3")
}

tasks.test {
    useJUnitPlatform()
}
kotlin {
    jvmToolchain(21)
}