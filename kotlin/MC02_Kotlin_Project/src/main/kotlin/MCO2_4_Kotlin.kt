

import org.jetbrains.kotlinx.dataframe.DataFrame
import org.jetbrains.kotlinx.dataframe.exceptions.CellConversionException
import org.jetbrains.kotlinx.dataframe.io.readCsv
import org.jetbrains.kotlinx.dataframe.api.filter
import java.io.FileNotFoundException

fun main() {
    displayMenu()
    // The directory where the code is executed is in MC02_Kotlin_Project folder so we have to go back two levels to reach the data folder
    val dfFloodControl = loadCsvSafe("../../data/dpwh_flood_control_projects.csv")
    val dfFloodControlFiltered = dfFloodControl?.filter { it["FundingYear"] in 2021..2023 }
    println("(${dfFloodControl?.rowsCount()} rows loaded, ${dfFloodControlFiltered?.rowsCount()} filtered for 2021-2023)")

}
fun loadCsvSafe(filePath: String): DataFrame<*>? {
    return try {
        DataFrame.readCsv(filePath)
    } catch (e: FileNotFoundException) {
        System.err.println("Error: File not found at path: $filePath")
        e.printStackTrace()
        null
    } catch (e: CellConversionException) {
        System.err.println("Error: Data conversion issue while reading the CSV file.")
        e.printStackTrace()
        null
    }
    finally {
        print("Processing dataset...")
    }
}
fun displayMenu() {
    println("Select Language Implementation: ")
    println("[1] Load the file")
    println("[2] Generate Reports\n")
}