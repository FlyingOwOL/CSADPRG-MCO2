

import org.jetbrains.kotlinx.dataframe.DataFrame
import org.jetbrains.kotlinx.dataframe.io.*
import org.jetbrains.kotlinx.dataframe.api.*
//Exception handling imports
import java.io.FileNotFoundException
import org.jetbrains.kotlinx.dataframe.exceptions.CellConversionException
import kotlinx.datetime.LocalDate
import kotlinx.datetime.daysUntil
import org.jetbrains.kotlinx.dataframe.DataRow
import java.math.RoundingMode
import java.math.BigDecimal

fun main() {
    var userInput : Int
    var dfFloodControlFinal: DataFrame<*>? = null

    welcomeTitle()

    do {
        displayMenu()
        print("Enter your choice: ")
        userInput = readln().toIntOrNull() ?: -1
        when(userInput) {
            1 -> {
                if (dfFloodControlFinal != null) {
                    println("Dataset already loaded. Please proceed to generate reports.")
                    continue
                }
                val dfFloodControl = loadCsvSafe("../../data/dpwh_flood_control_projects.csv")
                dfFloodControlFinal = filterDataFrame(dfFloodControl)
                println("(${dfFloodControl?.rowsCount()} rows loaded, ${dfFloodControlFinal.rowsCount()} filtered for 2021-2023)")
            }
            2 -> {
                if (dfFloodControlFinal == null) {
                    println("Error: Please load the dataset first by selecting option 1.")
                    continue
                }
                // ---------------------------------------------------------------
                //     Report 1 : Regional Flood Mitigation Efficiency Summary
                // ---------------------------------------------------------------
                val dfReport1  = generateReport1(dfFloodControlFinal)
                printTableDetails(1, "Regional Flood Mitigation Efficiency Summary", "(Filtered for 2021-2023 Projects)")
                dfReport1.print(rowsLimit=dfReport1.rowsCount(),borders=true, rowIndex=false, alignLeft=true)
                dfReport1.writeCsv("src/main/resources/report1_regional_summary.csv")
                // ---------------------------------------------------------------
                //         Report 2 : Top Contractors Performance Ranking
                // ---------------------------------------------------------------
                val dfReport2 = generateReport2(dfFloodControlFinal)
                printTableDetails(2, "Top Contractors Performance Ranking", "(Top 15 by TotalCost, >=5 Projects)")
                dfReport2.print(valueLimit=100,borders=true, rowIndex=false, alignLeft=true)
                dfReport2.writeCsv("src/main/resources/report2_contractor_ranking.csv")
                // ---------------------------------------------------------------
                //         Report 3 : Annual Project Type Cost Overrun Trends
                // ---------------------------------------------------------------
                val dfReport3 = generateReport3(dfFloodControlFinal)
                printTableDetails(3, "Annual Project Type Cost Overrun Trends", "(Grouped by FundingYear and TypeOfWork)")
                dfReport3.print(rowsLimit=dfReport3.rowsCount(),valueLimit=100, borders=true, rowIndex=false, alignLeft=true)
                dfReport3.writeCsv("src/main/resources/report3_annual_trends.csv")

                // ---------------------------------------------------------------
                //                     Summary.json Creation
                // ---------------------------------------------------------------
                val dfSummaryJson = generateDfSummary(dfFloodControlFinal)
                dfSummaryJson.writeJson("src/main/resources/summary.json",true)

            }
            3 -> println("Exiting the program.")
            else -> println("Invalid input. Please enter a number between 1 and 3")
        }
    } while(userInput != 3)
}

fun printTableDetails(reportNum : Int, title: String, subtitle: String) {
    println("Report $reportNum: $title\n")
    println(title)
    println(subtitle)
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
fun Double.round(decimalPlaces: Int): Double {
    return BigDecimal(this).setScale(decimalPlaces, RoundingMode.HALF_UP).toDouble()
}
fun Number.formatWithCommas(): String {
    return if (this is Int || this is Long) "%,d".format(this) else "%,.2f".format(this)
}
fun displayMenu() {
    println("\nSelect Language Implementation: ")
    println("[1] Load the file")
    println("[2] Generate Reports")
    println("[3] Exit Program\n")
}
fun welcomeTitle() {
    println("?==================================================?")
    println("|    DPWH Flood Control Project Analysis System    |")
    println("|           Data Analysis Tool (Kotlin)            |")
    println("?==================================================?")
}
fun filterDataFrame(dfFloodControl: DataFrame<*>?): DataFrame<*> {
    // The directory where the code is executed is in MC02_Kotlin_Project folder so we have to go back two levels to reach the data folder
    // this variable is responsible to the original number of rows loaded before the filtering process
    // Filtering for the years 2021, 2022, 2023 only in funding year column
    // Also keeping rows with non-zero and non-negative values in ApprovedBudgetForContract and ContractCost columns
    val dfFloodControlFiltered = dfFloodControl?.filter { it["FundingYear"] as Int in intArrayOf(2021, 2022, 2023)}
    // Replacing missing Municipality with sentinel value "N/A" because it is not important for the analysis
    val dfFloodControlFillMissingStrings = dfFloodControlFiltered?.fillNA {it["Municipality"]}.with{"N/A"}
    val dfFloodControlRemoveNARows = dfFloodControlFillMissingStrings.dropNulls {
        "ApprovedBudgetForContract" and
                "ContractCost" and
                "StartDate" and
                "ActualCompletionDate" and
                "ProvincialCapitalLatitude" and
                "ProvincialCapitalLongitude"
    }
    // Removing rows with string values in financial columns and converting the columns to Double type
    // Also removing rows with zero or negative values in financial columns
    val dfFloodControlWithoutStringFinancial = dfFloodControlRemoveNARows.filter {(it["ApprovedBudgetForContract"].toString().toDoubleOrNull() != null) &&
            it["ContractCost"].toString().toDoubleOrNull() != null}
    val dfFloodControlFinancialToDouble = dfFloodControlWithoutStringFinancial.convert("ApprovedBudgetForContract", "ContractCost").toDouble()
    val checkValidFinancialRows = dfFloodControlFinancialToDouble.filter {
        it["ApprovedBudgetForContract"] as Double > 0.0 &&
                it["ContractCost"] as Double > 0.0
    }
    val dfFloodControlFinal = checkValidFinancialRows.add{
        "CostSavings" from {
            (it["ApprovedBudgetForContract"] as Double - it["ContractCost"] as Double).round(2)
        }
        "CompletionDelayDays" from {
            val endDate = it["ActualCompletionDate"] as LocalDate
            val startDate = it["StartDate"] as LocalDate
            //https://kotlinlang.org/api/kotlinx-datetime/kotlinx-datetime/kotlinx.datetime/days-until.html
            startDate.daysUntil(endDate)
        }
    }
    return dfFloodControlFinal
}
fun generateReport1(dfFloodControlFinal: DataFrame<*>): DataFrame<*> {
    val dfFloodControlRequiredColumns = dfFloodControlFinal.select {"Region" and "MainIsland" and "ApprovedBudgetForContract" and "CostSavings" and "CompletionDelayDays"}
    val dfGroupRegionAndMainIsland = dfFloodControlRequiredColumns.groupBy("Region", "MainIsland").aggregate {
        (sum("ApprovedBudgetForContract") as Double).round(2)  into "TotalBudget"
        (median("CostSavings") as Double).round(2) into "MedianSavings"
        mean("CompletionDelayDays").round(2)  into "AvgDelay"
        ((count { it["CompletionDelayDays"] as Int > 30 }.toDouble() / count().toDouble()) * 100.00).round(2) into "HighDelayPct"
    }
    val dfAddEfficiencyScore = dfGroupRegionAndMainIsland.add {
        "EfficiencyScoreRaw" from {
            val medianSavings = it["MedianSavings"] as Double
            val avgDelay = it["AvgDelay"] as Double
            if (avgDelay != 0.0) (medianSavings / avgDelay).round(2) * 100 else 0.00
        }
    }
    val dfNormalizedEfficiencyScore = dfAddEfficiencyScore.add {
        "EfficiencyScore" from {
            val minScore = dfAddEfficiencyScore.min("EfficiencyScoreRaw") as Double
            val maxScore = dfAddEfficiencyScore.max("EfficiencyScoreRaw") as Double
            val denominator =  if ((maxScore - minScore) != 0.0) (maxScore - minScore) else 1.0
            val efficiencyScore = it["EfficiencyScoreRaw"] as Double
            val normalizedScore = ((efficiencyScore - minScore) / denominator) * 100
            if (maxScore - minScore != 0.0) normalizedScore.round(2) else 0.00
        }
    }.remove("EfficiencyScoreRaw")
    val dfSortedReport1 = dfNormalizedEfficiencyScore.sortByDesc{it["EfficiencyScore"]}
    val dfFormattedReport1 = dfSortedReport1.convert("TotalBudget", "MedianSavings", "AvgDelay", "EfficiencyScore").with {
        (it as Double).formatWithCommas()
    }
    return dfFormattedReport1
}
fun generateReport2(dfFloodControlFinal: DataFrame<*>): DataFrame<*> {
    val dfFloodControlRequiredColumns2 = dfFloodControlFinal.select {"Contractor" and "ContractCost" and "ProjectId" and "CompletionDelayDays" and "CostSavings"}
    val dfGroupContractor = dfFloodControlRequiredColumns2.groupBy("Contractor").aggregate {
        (sum("ContractCost") as Double).round(2) into "TotalCost"
        countDistinct("ProjectId") into "NumProjects"
        mean("CompletionDelayDays").round(2) into "AvgDelay"
        (sum("CostSavings") as Double).round(2) into "TotalSavings"
    }
    val dfGreaterThanFiveProjectsContractors = dfGroupContractor.filter { it["NumProjects"] as Int > 5}
    val dfAddReliabilityIndex = dfGreaterThanFiveProjectsContractors.add {
        "ReliabilityIndex" from {
            val avgDelay = it["AvgDelay"] as Double
            val totalSavings =it["TotalSavings"] as Double
            val totalCost = it["TotalCost"] as Double
            val reliabilityIndex = (1 - (avgDelay / 90.00)) * (totalSavings / totalCost) * 100

            if (reliabilityIndex <= 100.00) reliabilityIndex else 100.00
        }
    }
    val dfAddRiskFlag = dfAddReliabilityIndex.add {
        "RiskFlag" from {
            val reliabilityIndex = it["ReliabilityIndex"] as Double
            if (reliabilityIndex < 50.00) "High Risk" else "Low Risk"
        }
    }
    val dfSortedReport2 = dfAddRiskFlag.sortByDesc { it["TotalCost"]}
    val dfWithRanking = dfSortedReport2.insert("Rank") {
        index() + 1
    }.at(0)
    val dfTop15Contractors = dfWithRanking.take(15)
    val dfFormattedReport2 = dfTop15Contractors.convert("TotalCost", "AvgDelay", "TotalSavings", "ReliabilityIndex").with {
        (it as Double).formatWithCommas()
    }.convert("NumProjects").with {
        (it as Int).formatWithCommas()
    }
    return dfFormattedReport2
}
fun generateReport3(dfFloodControlFinal: DataFrame<*>): DataFrame<*> {
    val dfFloodControlRequiredColumns3  = dfFloodControlFinal.select {"FundingYear" and "TypeOfWork" and "CostSavings" and "ApprovedBudgetForContract" and "ProjectId"}
    val dfGroupYearAndTypeOfWork = dfFloodControlRequiredColumns3.groupBy("FundingYear", "TypeOfWork").aggregate {
        countDistinct("ProjectId") into "TotalProjects"
        mean("CostSavings").round(2) into "AvgSavings"
        count { (it["CostSavings"] as Double) < 0.00} into "NumOverrunProjects"
        count() into "NumTotalProjects"
    }
    val dfAddOverrunRate = dfGroupYearAndTypeOfWork.add {
        "OverrunRate" from {
            val numOverrunProjects = it["NumOverrunProjects"] as Int
            val numTotalProjects = it["NumTotalProjects"] as Int
            if (numTotalProjects != 0) ((numOverrunProjects.toDouble() / numTotalProjects.toDouble()) * 100.00).round(2) else 0.00
        }
    }.remove("NumOverrunProjects", "NumTotalProjects")
    val dfAddYoYChange = dfAddOverrunRate.add {
        "YoYChange" from { outerIt ->
            val fundingYear = outerIt["FundingYear"] as Int
            val typeOfWork = outerIt["TypeOfWork"] as String
            val previousYear = fundingYear - 1
            val previousAvg = (dfAddOverrunRate.filter {
                (it["FundingYear"] as Int) == previousYear && (it["TypeOfWork"] as String) == typeOfWork
            }.firstOrNull()?.get("AvgSavings"))
            // previous row count will only be less than zero if there is no previous yea data which means 2021 is the baseline
            if ((outerIt["FundingYear"] as Int) != 2021 && previousAvg != null)
                ((outerIt["AvgSavings"] as Double) - previousAvg as Double) / previousAvg * 100.00
            else 0.00
        }
    }
    val dfSortedReport3 = dfAddYoYChange.sortBy { it["FundingYear"] and it["AvgSavings"].desc()}
    val dfFormattedReport3 = dfSortedReport3.convert("AvgSavings", "OverrunRate", "YoYChange") {
        (it as Double).formatWithCommas()
    }.convert("TotalProjects") {
        (it as Int).formatWithCommas()
    }
    return dfFormattedReport3
}
fun generateDfSummary(dfFloodControlFinal: DataFrame<*>): DataRow<*> {
    val dfSummaryJson = dfFloodControlFinal.aggregate {
        countDistinct("ProjectId") into "total_projects"
        countDistinct("Contractor") into "total_contractors"
        countDistinct("Province") into "total_provinces"
        countDistinct("Region") into "total_regions"
        mean("CompletionDelayDays").round(2) into "global_avg_delay"
        (sum("CostSavings") as Double).round(2) into "global_total_savings"
        (sum("ApprovedBudgetForContract") as Double).round(2) into "global_total_budget"
        (min("FundingYear").toString() + "-" +  max("FundingYear").toString()) into "date_range"
    }
    return dfSummaryJson
}