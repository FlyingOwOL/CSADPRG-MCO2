/*********************
Last names: Dela Torre, Espada, Laguerta, Sy
Language: Rust
Paradigm(s): Procedural, Functional, Data-Oriented
*********************/

use std::io::{self, Write};
use std::error::Error;
use std::fs::File;
use std::path::{Path, PathBuf};
use std::cmp::Ordering;
use csv::{ReaderBuilder, Writer};
use serde::{Deserialize, Serialize};
use serde_json;
use chrono::NaiveDate;
use std::collections::{HashMap, HashSet};
use num_format::{Locale, ToFormattedString};

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct RawFloodControlProject {
    #[serde(rename = "MainIsland")]
    main_island: String,
    #[serde(rename = "Region")]
    region: String,
    #[serde(rename = "Province")]
    province: String,
    #[serde(rename = "ProjectId")]
    project_id: String,
    #[serde(rename = "ProjectName")]
    project_name: String,
    #[serde(rename = "TypeOfWork")]
    type_of_work: String,
    #[serde(rename = "FundingYear")]
    funding_year: Option<u32>,
    #[serde(rename = "ContractId")]
    contract_id: String,
    #[serde(rename = "ApprovedBudgetForContract")]
    approved_budget_for_contract: String,
    #[serde(rename = "ContractCost")]
    contract_cost: String,
    #[serde(rename = "ActualCompletionDate")]
    actual_completion_date: String,
    #[serde(rename = "Contractor")]
    contractor: String,
    #[serde(rename = "StartDate")]
    start_date: String,
    #[serde(rename = "ProjectLatitude")]
    project_latitude: String,
    #[serde(rename = "ProjectLongitude")]
    project_longitude: String,
    #[serde(rename = "ProvincialCapital")]
    provincial_capital: String,
    #[serde(rename = "ProvincialCapitalLatitude")]
    provincial_capital_latitude: String,
    #[serde(rename = "ProvincialCapitalLongitude")]
    provincial_capital_longitude: String,
}

//proper data types
#[allow(dead_code)]
#[derive(Debug, Clone)]
struct FloodControlProject {
    main_island: String,
    region: String,
    province: String,
    project_id: String,
    project_name: String,
    type_of_work: String,
    funding_year: u32,
    contract_id: String,
    approved_budget: f64,
    contract_cost: f64,
    actual_completion_date: NaiveDate, 
    start_date: NaiveDate,             
    contractor: String,
    latitude: f64,
    longitude: f64, 
    cost_savings: f64,
    completion_delay_days: i64,
}

#[derive(Debug, Clone, Serialize)]
struct RegionalStats {
    region: String,
    main_island: String,
    total_budget: f64,
    median_savings: f64,
    avg_delay: f64,
    high_delay_pct: f64,
    efficiency_score: f64,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize)]
struct ContractorStats {
    contractor: String,
    project_count: u32,
    total_contract_cost: f64,
    avg_completion_delay_days: f64,
    total_cost_savings: f64,
    reliability_index: f64,
    risk_flag: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize)]
struct CostOverrunStats {
    funding_year: u32,
    type_of_work: String,
    total_projects: u32,
    avg_cost_savings: f64,
    overrun_rate: f64,
    yoy_change: f64,
}

#[derive(Debug, Serialize)]
struct Summary {
    total_projects: usize,
    total_contractors: usize,
    total_provinces: usize,
    total_regions: usize,
    global_average_delay_days: f64,
    total_savings: f64,
    total_budget: f64,
    date_range: String,
}

fn print_menu() {
    println!("\n==============================================");
    println!("Flood Control Project Data Analysis Menu");
    println!("==============================================");
    println!("Select an option:");
    println!("[1]  Load Data File");
    println!("[2]  Generate Reports");
    println!("[3]  Exit");
}

fn input_integer() -> u32 { //function to ask user input number
    loop {
        let mut input:String = String::new();
        io::stdin().read_line(&mut input).expect("Failed to read");

        match input.trim().parse::<u32>() {
            Ok(num) => return num,
            Err(_) => println!("⚠ Invalid choice. Please enter an integer.."),
        }
    }
}

fn parse_budget(budget_str: &str) -> Option<f64> {
    budget_str.trim().parse::<f64>().ok()
}

fn parse_coordinate(coord_str: &str) -> Option<f64> {
    coord_str.trim().parse::<f64>().ok()
}

fn clean_project(raw: RawFloodControlProject, provincial_averages: &std::collections::HashMap<String, (f64, f64)>) 
    -> Option<FloodControlProject> {
    
    // filtering: funding year must be 2021-2023
    let year = match raw.funding_year {
        Some(y) if y >= 2021 && y <= 2023 => y,
        _ => return None,
    };

    // filtering: must have valid dates (parse once, use for validation and calculation)
    let start_date = NaiveDate::parse_from_str(&raw.start_date, "%Y-%m-%d").ok();
    let end_date = NaiveDate::parse_from_str(&raw.actual_completion_date, "%Y-%m-%d").ok();
    
    if start_date.is_none() || end_date.is_none() {
        return None;
    }

    // filtering: budget field must be float and > 0.0
    let approved_budget = match parse_budget(&raw.approved_budget_for_contract) {
        Some(ab) if ab > 0.0 => ab,
        _ => return None,
    };

    let contract_cost = match parse_budget(&raw.contract_cost) {
        Some(cc) if cc > 0.0 => cc,
        _ => return None,
    };

    //backup coordinates
    let (backup_lat, backup_long) = 
         provincial_averages.get(&raw.province).copied().unwrap_or((0.0, 0.0));

    //coordinates where pro
    let latitude = parse_coordinate(&raw.project_latitude)
        .filter(|&lat| lat != 0.0)
        .unwrap_or(backup_lat);

    let longitude = parse_coordinate(&raw.project_longitude)
        .filter(|&lon| lon != 0.0)
        .unwrap_or(backup_long);

    //filtering: skip if no valid coordinates available
    if latitude == 0.0 || longitude == 0.0 {
        return None;
    }

    let start = start_date.unwrap();
    let end = end_date.unwrap();

    Some(FloodControlProject {
        main_island: raw.main_island,
        region: raw.region,
        province: raw.province,
        project_id: raw.project_id,
        project_name: raw.project_name,
        type_of_work: raw.type_of_work,
        funding_year: year,
        contract_id: raw.contract_id,
        approved_budget,
        contract_cost,
        actual_completion_date: end,  
        start_date: start,           
        contractor: raw.contractor,
        latitude,
        longitude,
        cost_savings: approved_budget - contract_cost,
        completion_delay_days: (end - start).num_days(),
    })
}

fn read_csv_file<P: AsRef<Path>>(filename: P) 
    -> Result<Vec<FloodControlProject>, Box<dyn Error>> {
    let path = filename.as_ref();
    let file = File::open(path)?;
    let mut reader = ReaderBuilder::new().from_reader(file);
    
    let mut total_row_count: usize = 0;
    let mut filtered_row_count: usize = 0;
    let mut projects: Vec<FloodControlProject> = Vec::new();
    
    //hashmap for provincial averages (province -> (lat, long))
    let mut provincial_fallbacks: HashMap<String, (f64, f64)> = HashMap::new();
    
    for result in reader.deserialize::<RawFloodControlProject>() {
        total_row_count += 1;
        
        if let Ok(raw_project) = result {
            if !provincial_fallbacks.contains_key(&raw_project.province) { //check if province already exists
                let cap_lat = parse_coordinate(&raw_project.provincial_capital_latitude).unwrap_or(0.0);
                let cap_lon = parse_coordinate(&raw_project.provincial_capital_longitude).unwrap_or(0.0);
                provincial_fallbacks.insert(raw_project.province.clone(), (cap_lat, cap_lon)); //insert to hashmap
            }
            
            //if clean_project returns Some, add to projects
            if let Some(fcp) = clean_project(raw_project, &provincial_fallbacks) {
                projects.push(fcp);
                filtered_row_count += 1;
            }
        }
    }

    println!("Processing data...({} rows loaded, {} filtered for 2021-2023)", total_row_count, filtered_row_count);
    
    Ok(projects)
}

fn compute_median(v: &[f64]) -> f64 {
    if v.is_empty() {
        return 0.0;
    }

    let mut sorted = v.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let len = sorted.len();
    if len % 2 == 1 {
        sorted[len / 2]
    } else {
        (sorted[len / 2 - 1] + sorted[len / 2]) / 2.0
    }
}

fn normalize_score(raw_score: f64, min_score: f64, max_score: f64) -> f64 {
    if max_score > min_score {
        ((raw_score - min_score) / (max_score - min_score)) * 100.0
    } else {
        0.0
    }
}

fn format_currency(amount: f64) -> String {
    format!("{}.{:02}", 
        (amount as i64).to_formatted_string(&Locale::en),
        ((amount.fract() * 100.0).abs() as i32))
}

fn aggregate_regional_stats(projects: &Vec<FloodControlProject>) -> Vec<RegionalStats> {
    let mut results: Vec<RegionalStats> = Vec::new();
    let mut regional_map: HashMap<String, (String, f64, Vec<f64>, i64, u32, u32)> = HashMap::new();
    // region: (main_island, total_budget, cost_savings, total_completion_days, high_delay_count, project_count)

    for project in projects {
        let entry = regional_map.entry(project.region.clone()).or_insert((
            project.main_island.clone(),
            0.0,
            Vec::new(),
            0,
            0,
            0,
        )); //initate entry if not exists

        entry.1 += project.approved_budget;
        entry.2.push(project.cost_savings);
        entry.3 += project.completion_delay_days;
        if project.completion_delay_days > 30 {
            entry.4 += 1; 
        }   
        entry.5 += 1;
    }

    //computing stats per region
    for (region, (main_island, total_budget, cost_savings, total_completion_days, high_delay_count, project_count)) in &regional_map {
        let median_savings = compute_median(cost_savings);
        let avg_delay = if *project_count > 0 {
            *total_completion_days as f64 / *project_count as f64
        } else { 0.0 };
        let high_delay_pct = if *project_count > 0 {
            (*high_delay_count as f64 / *project_count as f64) * 100.0
        } else { 0.0 };
        
        let raw_score = if avg_delay > 0.0 {
            (median_savings / avg_delay) * 100.0
        } else { 0.0 };
        
        results.push(RegionalStats {
            region: region.clone(),
            main_island: main_island.clone(),
            total_budget: *total_budget,
            median_savings,
            avg_delay,
            high_delay_pct,
            efficiency_score: raw_score, //store raw score, normalize later
        });
    }

    let min_score = results.iter().map(|s| s.efficiency_score).fold(f64::INFINITY, f64::min);
    let max_score = results.iter().map(|s| s.efficiency_score).fold(f64::NEG_INFINITY, f64::max);
    
    for stats in &mut results {
        stats.efficiency_score = normalize_score(stats.efficiency_score, min_score, max_score);
    }

    results 
}

fn aggregate_contractor_stats(projects: &Vec<FloodControlProject>) -> Vec<ContractorStats> {
    let mut results: Vec<ContractorStats> = Vec::new();
    let mut contractor_map: HashMap<String, (u32, f64, i64, f64)> = HashMap::new();
    // contractor: (project_count, total_contract_cost, total_completion_days, total_cost_savings)

    for project in projects {
        let entry = contractor_map.entry(project.contractor.clone()).or_insert((
            0,
            0.0,
            0,
            0.0,
        )); //initate entry if not exists

        entry.0 += 1;
        entry.1 += project.contract_cost;
        entry.2 += project.completion_delay_days;
        entry.3 += project.cost_savings;
    }

    for (contractor, (project_count, total_contract_cost, total_completion_days, total_cost_savings )) in &contractor_map {
        if project_count < &5 {
            continue; // skip contractors with less than 5 projects
        }

        let avg_delay = //avg delay calculation
        if *project_count > 0 { *total_completion_days as f64 / *project_count as f64 } else { 0.0 };
        
        let reliability_index = (1.0 - (avg_delay / 90.0)) * (total_cost_savings / total_contract_cost) * 100.0;

        results.push(ContractorStats {
            contractor: contractor.clone(),
            project_count: *project_count,
            total_contract_cost: *total_contract_cost,
            avg_completion_delay_days: avg_delay,
            total_cost_savings: *total_cost_savings,
            reliability_index,
            risk_flag: if reliability_index < 50.0 { "High".to_string() } else { "Low".to_string() },
        });
    }

    results
}

fn aggregate_cost_stats(projects: &Vec<FloodControlProject>) -> Vec<CostOverrunStats> {
    let mut results: Vec<CostOverrunStats> = Vec::new();
    let mut cost_map: HashMap<(u32, String), (u32, u32, f64)> = HashMap::new();
    // (funding_year, type_of_work): (total_projects, total_cost_savings)

    for project in projects {
        let key = (project.funding_year, project.type_of_work.clone());
        let entry = cost_map.entry(key).or_insert((0, 0, 0.0));
        entry.0 += 1;
        entry.2 += project.cost_savings;

        if project.cost_savings < 0.0 {
            entry.1 += 1; // count of cost overruns
        }
    }

    for ((funding_year, type_of_work), (total_projects, negative_cost, total_cost_savings)) in &cost_map {
        let avg_cost_savings = if *total_projects > 0 {  *total_cost_savings / *total_projects as f64 } else { 0.0 };
        let overrun_rate = if *total_projects > 0 { (*negative_cost as f64 / *total_projects as f64) * 100.0 } else { 0.0 };

        results.push(CostOverrunStats {
            funding_year: *funding_year,
            type_of_work: type_of_work.clone(),
            total_projects: *total_projects,
            avg_cost_savings,
            overrun_rate,
            yoy_change: 0.0, //not yet to be computed
        });
    }

    results.sort_by(|a, b| {
        a.type_of_work.cmp(&b.type_of_work)
            .then(a.funding_year.cmp(&b.funding_year))
    });

    for i in 0..results.len() {

        if results[i].funding_year == 2021 {
            results[i].yoy_change = 0.0;
        }
        else if i > 0 && 
            results[i].type_of_work == results[i - 1].type_of_work && 
            results[i].funding_year == results[i - 1].funding_year + 1 {

            let prev_avg = (results[i-1].avg_cost_savings * 100.0).round() / 100.0;
            let curr_avg = (results[i].avg_cost_savings * 100.0).round() / 100.0;
            
            if prev_avg.abs() < 0.01 { 
                results[i].yoy_change = 0.0;
            } else { 
                results[i].yoy_change = ((curr_avg - prev_avg) / prev_avg) * 100.0;
            }
        }
        else { 
            results[i].yoy_change = 0.0; //no matching prior year data
        }
    }

    results
}

fn display_flood_mitigation_report(regional_stats: &[RegionalStats]) {
    println!("\nRegional Flood Mitigation Efficiency Summary");
    println!("(Filtered: 2021-2023 Projects)");
    println!("-----------------------------------------------------------------------------------------------------------------------------------------");
    println!("| {:<35} | {:>10} | {:>20} | {:>15} | {:>10} | {:>10} | {:>15} |", 
             "Region", "MainIsland", "TotalBudget", "MedianSavings", "AvgDelay", "HighDelay%", "EfficiencyScore");
    println!("-----------------------------------------------------------------------------------------------------------------------------------------");
    
    for stats in regional_stats {
        let formatted_budget = format_currency(stats.total_budget);
        let formatted_savings = format_currency(stats.median_savings);

        println!("| {:<35} | {:>10} | {:>20} | {:>15} | {:>10.2} | {:>10.2} | {:>15.2} |", 
            stats.region,
            stats.main_island,
            formatted_budget,
            formatted_savings,
            stats.avg_delay,
            stats.high_delay_pct,
            stats.efficiency_score
        );
    }
    println!("-----------------------------------------------------------------------------------------------------------------------------------------");
}

fn display_contractor_performance_report(contractor_stats: &[ContractorStats]) {
    println!("\nContractor Performance Summary (Top 15)");
    println!("(Filtered: Contractors with at least 5 Projects, Ranked by Total Contract Cost)");
    println!("--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------");
    println!("| {:>4} | {:<85} | {:>8} | {:>17} | {:>8} | {:>15} | {:>12} | {:>8} |", 
             "Rank", "Contractor", "Projects", "TotalCost", "AvgDelay", "TotalSavings", "Reliability", "RiskFlag");
    println!("--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------");
    
    let mut rank = 1;

    for stats in contractor_stats {
        let formatted_contract_cost = format_currency(stats.total_contract_cost);
        let formatted_cost_savings = format_currency(stats.total_cost_savings);

        println!("| {:>4} | {:<85} | {:>8} | {:>17} | {:>8.2} | {:>15} | {:>12.2} | {:>8} |", 
            rank,
            stats.contractor,
            stats.project_count,
            formatted_contract_cost,
            stats.avg_completion_delay_days,
            formatted_cost_savings,
            stats.reliability_index,
            stats.risk_flag
        );

        rank += 1;
    }
    println!("--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------");
}

fn display_cost_overrun_report(cost_stats: &[CostOverrunStats]) {
    println!("\nCost Overrun Analysis Summary");
    println!("(Filtered: 2021-2023 Projects)");
    println!("-------------------------------------------------------------------------------------------------------------------------------------------------");
    println!("| {:<12} | {:<60} | {:>12} | {:>15} | {:>12} | {:>15} |", 
             "FundingYear", "TypeOfWork", "Projects", "AvgSavings", "OverrunRate", "YoYChange");
    println!("-------------------------------------------------------------------------------------------------------------------------------------------------");
    
    for stats in cost_stats {
        let formatted_avg_savings = format_currency(stats.avg_cost_savings);
        let formatted_yoy_change = format_currency(stats.yoy_change);

        println!("| {:<12} | {:<60} | {:>12} | {:>15} | {:>12.2} | {:>15} |", 
            stats.funding_year,
            stats.type_of_work,
            stats.total_projects,
            formatted_avg_savings,
            stats.overrun_rate,
            formatted_yoy_change
        );
    }
    println!("-------------------------------------------------------------------------------------------------------------------------------------------------");
}

fn regional_flood_mitgation_report(projects: &Vec<FloodControlProject>) -> Result<(), Box<dyn Error>> {
    let mut regional_stats = aggregate_regional_stats(projects);
    
    regional_stats.sort_by(|a, b| b.efficiency_score.partial_cmp(&a.efficiency_score).unwrap_or(Ordering::Equal));

    display_flood_mitigation_report(&regional_stats);
    export_regional_stats_csv(&regional_stats, "report1_regional_summary.csv")?;
    Ok(())
}

fn contractor_performance_report(projects: &Vec<FloodControlProject>) -> Result<(), Box<dyn Error>> {
    let mut contractor_stats: Vec<ContractorStats> = aggregate_contractor_stats(projects);
    
    contractor_stats.sort_by(|a,b| b.total_contract_cost.partial_cmp(&a.total_contract_cost).unwrap_or(Ordering::Equal));
    contractor_stats.truncate(15);
    
    display_contractor_performance_report(&contractor_stats);
    export_contractor_stats_csv(&contractor_stats, "report2_contractor_ranking.csv")?;
    Ok(())
}

fn cost_overrun_report(projects: &Vec<FloodControlProject>) -> Result<(), Box<dyn Error>> {
    let mut cost_stats: Vec<CostOverrunStats> = aggregate_cost_stats(projects);
    
    cost_stats.sort_by(|a, b| {
        a.funding_year.cmp(&b.funding_year)
            .then(b.avg_cost_savings.partial_cmp(&a.avg_cost_savings).unwrap_or(Ordering::Equal))
    });

    display_cost_overrun_report(&cost_stats);
    export_cost_overrun_stats_csv(&cost_stats, "report3_annual_trends.csv")?;
    Ok(())
}

fn export_regional_stats_csv(data: &[RegionalStats], filename: &str) -> Result<(), Box<dyn Error>> {
    let output_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("data").join(filename);
    let mut writer = Writer::from_path(output_path)?;
    
    //header
    writer.write_record(&["Region", "MainIsland", "TotalBudget", "MedianSavings", "AvgDelay", "HighDelay%", "EfficiencyScore"])?;
    
    //format and write data
    for stat in data {
        writer.write_record(&[
            &stat.region,
            &stat.main_island,
            &format_currency(stat.total_budget),
            &format_currency(stat.median_savings),
            &format!("{:.2}", stat.avg_delay),
            &format!("{:.2}", stat.high_delay_pct),
            &format!("{:.2}", stat.efficiency_score),
        ])?;
    }
    
    writer.flush()?;
    println!("✓ Exported to data/{}", filename);
    Ok(())
}

fn export_contractor_stats_csv(data: &[ContractorStats], filename: &str) -> Result<(), Box<dyn Error>> {
    let output_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("data").join(filename);
    let mut writer = Writer::from_path(output_path)?;
    
    //header
    writer.write_record(&["Contractor", "ProjectCount", "TotalContractCost", "AvgCompletionDelayDays", "TotalCostSavings", "ReliabilityIndex", "RiskFlag"])?;
    
    //format and write data
    for stat in data {
        writer.write_record(&[
            &stat.contractor,
            &stat.project_count.to_string(),
            &format_currency(stat.total_contract_cost),
            &format!("{:.2}", stat.avg_completion_delay_days),
            &format_currency(stat.total_cost_savings),
            &format!("{:.2}", stat.reliability_index),
            &stat.risk_flag,
        ])?;
    }
    
    writer.flush()?;
    println!("✓ Exported to data/{}", filename);
    Ok(())
}

fn export_cost_overrun_stats_csv(data: &[CostOverrunStats], filename: &str) -> Result<(), Box<dyn Error>> {
    let output_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("data").join(filename);
    let mut writer = Writer::from_path(output_path)?;
    
    //header
    writer.write_record(&["FundingYear", "TypeOfWork", "TotalProjects", "AvgCostSavings", "OverrunRate", "YoYChange"])?;
    
    //format and write data
    for stat in data {
        writer.write_record(&[
            &stat.funding_year.to_string(),
            &stat.type_of_work,
            &stat.total_projects.to_string(),
            &format_currency(stat.avg_cost_savings),
            &format!("{:.2}", stat.overrun_rate),
            &format!("{:.2}", stat.yoy_change),
        ])?;
    }
    
    writer.flush()?;
    println!("✓ Exported to data/{}", filename);
    Ok(())
}

fn generate_summary_json(projects: &Vec<FloodControlProject>) -> Result<(), Box<dyn Error>> {
    let total_projects = projects.len();
    
    let contractors: HashSet<&String> = projects.iter().map(|p| &p.contractor).collect();
    let total_contractors = contractors.len();
    
    let provinces: HashSet<&String> = projects.iter().map(|p| &p.province).collect();
    let total_provinces = provinces.len();
    
    let regions: HashSet<&String> = projects.iter().map(|p| &p.region).collect();
    let total_regions = regions.len();
    
    let total_delay: f64 = projects.iter().map(|p| p.completion_delay_days as f64).sum();
    let global_average_delay_days = if total_projects > 0 { total_delay / total_projects as f64 } else { 0.0 };
    
    let total_savings: f64 = projects.iter().map(|p| p.cost_savings) .sum();
    
    let total_budget: f64 = projects.iter().map(|p| p.contract_cost).sum();
    
    let date_range = "2021-2023".to_string();
    
    let summary = Summary {
        total_projects,
        total_contractors,
        total_provinces,
        total_regions,
        global_average_delay_days: (global_average_delay_days * 100.0).round() / 100.0,
        total_savings: (total_savings * 100.0).round() / 100.0, 
        total_budget: (total_budget * 100.0).round() / 100.0, 
        date_range,
    };
    
    let output_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("data").join("summary.json");
    let json_string = serde_json::to_string_pretty(&summary)?;
    std::fs::write(output_path, json_string)?;
    
    println!("✓ Exported summary to data/summary.json");
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let mut csv_path: PathBuf;
    let mut choice: u32;
    let mut projects: Option<Vec<FloodControlProject>> = None;

    println!("\n╔════════════════════════════════════════════════╗");
    println!("║  DPWH Flood Control Project Analysis System    ║");
    println!("║           Data Analysis Tool (Rust)            ║");
    println!("╚════════════════════════════════════════════════╝");

    loop {
        //in any computers, this program can be run without changing the path of the csv file
        csv_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("data").join("dpwh_flood_control_projects.csv");
        print_menu();
        print!("\nEnter your choice: ");
        io::stdout().flush().unwrap();
        choice = input_integer();

        match choice {
            1 => {
                if projects.is_some() {
                    println!("✓ Data file already loaded. Ready to generate reports.");
                }
                else {
                    projects = Some(read_csv_file(csv_path)?);
                }
            },
            2 => {
                if let Some(ref data) = projects {
                    println!("\n>>> Generating all reports...\n");
                    println!("Output is saved to individual files");

                    regional_flood_mitgation_report(data)?;
                    contractor_performance_report(data)?;
                    cost_overrun_report(data)?;
                    generate_summary_json(data)?;

                }
                else {
                    println!("⚠ Error: No data loaded. Please select option [1] to load the data file first.\n");
                }
            },
            3 => {
                println!("Exiting program...\n");
                break Ok(());
            },
            _ => println!("⚠ Invalid choice. Please enter 1, 2, or 3.\n"),
        }
    }
}
