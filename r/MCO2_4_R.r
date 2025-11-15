# If 'tidyverse' is old or not installed yet, uncomment the below line for this code to work.
# Once 'tidyverse' is already installed on the first run, it can be commented again so
# that it would not download 1.2MB over and over.
#
# Same goes for 'jsonlite'.
#

#suppressMessages(install.packages('tidyverse',repos='https://cloud.r-project.org'))
#suppressMessages(install.packages('jsonlite',repos='https://cloud.r-project.org'))
suppressMessages(library(tidyverse))
suppressMessages(library(jsonlite))
options(width=1000)

DEFAULT_CSV_LOC <- '..\\data\\dpwh_flood_control_projects.csv'
DATA_FRAME <- NA

REP1_DEFNAME <- 'report1_regional_summary.csv'
REP2_DEFNAME <- 'report2_contractor_ranking.csv'
REP3_DEFNAME <- 'report3_annual_trends.csv'
JSON_DEFNAME <- 'summary.json'

# For reading inputs
prompter <- function(placeholder) {
	if (interactive()) {
		readline(placeholder)
	} else {
		cat(placeholder)
		readLines("stdin",n=1)
	}
}

# For sending outputs
printer <- function(msg) { if (interactive()) print(msg) else cat(msg) }

# Converting to numbers
force_numeric <- function(input) {
	# RegEx the input if it's numeric or not
	isnum<-grepl("^([-+]?)((\\.?\\d+)|(\\d+\\.?(\\d+)?))$",input)
	# Convert natively if numeric, otherwise return NA
	return(ifelse(isnum,as.numeric(input),NA))
}

# Suppress messages and warnings if needed
smw <- function(expr) {
	suppressMessages(suppressWarnings(expr))
}

report1 <- function(content) {
	csv_new <- (content %>%
		mutate(
			CostSavings=force_numeric(ApprovedBudgetForContract)-force_numeric(ContractCost),
			Delay=as.numeric(as.Date(ActualCompletionDate)-as.Date(StartDate),units='days')
		) %>%
		group_by(Region,MainIsland) %>%
		summarize(
			Projects=n(),
			TotalBudget=sum(force_numeric(ApprovedBudgetForContract)),
			MedianSavings=median(CostSavings),
			AvgDelayInDays=ceiling(mean(Delay)),
			HighDelayCount=sum(Delay>30)
		) %>%
		ungroup() %>%
		mutate(
			HighDelayPct=HighDelayCount/Projects*100.0,
			RawScore=MedianSavings/AvgDelayInDays*100.0
		) %>%
		mutate(EfficiencyScore=(RawScore-min(RawScore))/(max(RawScore)-min(RawScore))*100.0) %>%
		select(-Projects,-HighDelayCount,-RawScore) %>%
		arrange(desc(EfficiencyScore)) %>%
		mutate(across(c(TotalBudget,MedianSavings,HighDelayPct,EfficiencyScore),~round(.,digits=2))) %>%
		mutate(across(c(TotalBudget,MedianSavings,HighDelayPct,EfficiencyScore),~prettyNum(.,nsmall=2,big.mark=',',scientific=FALSE)))
	)
	csv_new_rows<-nrow(csv_new)
	return(list(content=csv_new,rows=csv_new_rows))
}

report2 <- function(content) {
	csv_new <- (content %>%
		mutate(
			CostSavings=force_numeric(ApprovedBudgetForContract)-force_numeric(ContractCost),
			Delay=as.numeric(as.Date(ActualCompletionDate)-as.Date(StartDate),units='days')
		) %>%
		group_by(Contractor) %>%
		summarize(
			Projects=n(),
			AvgDelayInDays=ceiling(mean(Delay)),
			TotalSavings=sum(force_numeric(CostSavings),na.rm=TRUE),
			TotalCost=sum(force_numeric(ContractCost))
		) %>%
		filter(Projects>=5) %>%
		top_n(15,wt=TotalCost) %>%
		ungroup() %>%
		mutate(RawRelScore=(1-(AvgDelayInDays/90))*(TotalSavings/TotalCost)*100) %>%
		mutate(ReliabilityScore=ifelse(is.na(RawRelScore),0,RawRelScore)) %>%
		mutate(IsHighRisk=ifelse(ReliabilityScore<50,'YES','NO')) %>%
		select(-RawRelScore) %>%
		arrange(desc(TotalCost),Contractor) %>%
		mutate(across(c(TotalSavings,TotalCost,ReliabilityScore),~round(.,digits=2))) %>%
		mutate(across(c(TotalSavings,TotalCost,ReliabilityScore),~prettyNum(.,nsmall=2,big.mark=',',scientific=FALSE)))
	)
	csv_new_rows<-nrow(csv_new)
	return(list(content=csv_new,rows=csv_new_rows))
}

report3 <- function(content) {
	csv_new <- (content %>%
		mutate(CostSavings=force_numeric(ApprovedBudgetForContract)-force_numeric(ContractCost)) %>%
		group_by(FundingYear,TypeOfWork) %>%
		summarize(
			Projects=n(),
			AvgSavings=mean(CostSavings),
			WithNegativeSavings=sum(CostSavings<0)
		) %>%
		filter(Projects>0) %>%
		arrange(TypeOfWork,FundingYear,desc(AvgSavings)) %>%
		mutate(OverrunRate=WithNegativeSavings/Projects*100) %>%
		ungroup() %>%
		mutate(
			PreviousAvgSavings=lag(AvgSavings,n=1),
			PreviousTypeOfWorkL=tolower(lag(TypeOfWork,n=1)),
			TypeOfWorkL=tolower(TypeOfWork),
			FundingYearDiff=FundingYear-lag(FundingYear,n=1)
		) %>%
		mutate(YoYGrowth=ifelse(is.na(AvgSavings)|is.na(PreviousAvgSavings)|is.na(FundingYearDiff)|
			is.na(TypeOfWorkL)|is.na(PreviousTypeOfWorkL)|PreviousTypeOfWorkL!=TypeOfWorkL|FundingYearDiff>1,
				0,(round(AvgSavings,digits=2)/round(PreviousAvgSavings,digits=2)-1)*100
		)) %>%
		select(-WithNegativeSavings,-PreviousAvgSavings,-PreviousTypeOfWorkL,-TypeOfWorkL,-FundingYearDiff) %>%
		arrange(FundingYear,desc(AvgSavings)) %>%
		mutate(across(c(AvgSavings,OverrunRate,YoYGrowth),~round(.,digits=2))) %>%
		mutate(across(c(AvgSavings,OverrunRate,YoYGrowth),~prettyNum(.,nsmall=2,big.mark=',',scientific=FALSE)))
	)
	csv_new_rows<-nrow(csv_new)
	return(list(content=csv_new,rows=csv_new_rows))
}

get_json_contents <- function(content) {
	return(
		list(
			total_projects=nrow(content),
			total_contractors=length(unique(content$Contractor)),
			total_provinces=length(unique(content$Province)),
			total_regions=length(unique(content$Region)),
			overall_average_delay=(content %>%
				mutate(Delay=as.numeric(as.Date(ActualCompletionDate)-as.Date(StartDate),units='days')) %>%
				summarize(AvgDelay=mean(Delay)) %>%
				pull(AvgDelay,1)
			),
			overall_total_savings=(content %>%
				mutate(CostSavings=force_numeric(ApprovedBudgetForContract)-force_numeric(ContractCost)) %>%
				summarize(TotalSavings=sum(CostSavings)) %>%
				pull(TotalSavings,1)
			),
			overall_total_budget=(content %>%
				summarize(OverallTotalBudget=sum(force_numeric(ApprovedBudgetForContract))) %>%
				pull(OverallTotalBudget,1)
			),
			year_begin=(content %>%
				summarize(YearBegin=min(as.numeric(FundingYear))) %>%
				pull(YearBegin,1)
			),
			year_end=(content %>%
				summarize(YearEnd=max(as.numeric(FundingYear))) %>%
				pull(YearEnd,1)
			)
		)
	)
}

load_file <- function(csv_path_to_file) {
	CSV_DATA <- smw(read_csv(csv_path_to_file))
	CSV_DATAF <- smw(CSV_DATA %>%
		filter(
			!is.na(force_numeric(ApprovedBudgetForContract)) &
			!is.na(force_numeric(ContractCost)) &
			!is.na(force_numeric(ProvincialCapitalLatitude)) &
			!is.na(force_numeric(ProvincialCapitalLongitude))
		)
	)
	CSV_DATAF <- CSV_DATAF %>%
		filter(FundingYear>=2021 & FundingYear<=2023)
	CSV_ROWS<-nrow(CSV_DATA)
	CSV_ROWSF<-nrow(CSV_DATAF)
	return(list(content=CSV_DATAF,rows=CSV_ROWS,frows=CSV_ROWSF))
}

gen_rep <- function(data_frame) {
	# Generate reports
	printer('\nGenerating reports...')
	rep1<-smw(report1(data_frame$content))
	prt1<-smw(rep1$content %>% head(n=3))
	rep2<-smw(report2(data_frame$content))
	prt2<-smw(rep2$content %>% head(n=3))
	rep3<-smw(report3(data_frame$content))
	prt3<-smw(rep3$content %>% head(n=3))
	jsondata<-get_json_contents(data_frame$content)
	prtjson<-smw(toJSON(jsondata,pretty=TRUE,auto_unbox=TRUE))
	# Write
	write_csv(rep1$content,REP1_DEFNAME)
	write_csv(rep2$content,REP2_DEFNAME)
	write_csv(rep3$content,REP3_DEFNAME)
	write_json(jsondata,JSON_DEFNAME,pretty=TRUE)
	printer('\nOutput saved to original files.')
	# Print report 1
	printer('\n\nReport 1: Regional Flood Mitigation Efficiency Summary')
	printer('\n(Filter: 2021-2023 Projects)\n\n')
	print.data.frame(prt1)
	printer(paste0('\n(Full table exported to \'',REP1_DEFNAME,'\'.)'))
	# Print report 2
	printer('\n\nReport 2: Top Contractors Performance Ranking')
	printer('\n(Top 15 by TotalCost, >=5 Projects)\n\n')
	print.data.frame(prt2)
	printer(paste0('\n(Full table exported to \'',REP2_DEFNAME,'\'.)'))
	# Print report 3
	printer('\n\nReport 3: Annual Project Type Cost Overrun Trends')
	printer('\n(Grouped by FundingYear and TypeOfWork)\n\n')
	print.data.frame(prt3)
	printer(paste0('\n(Full table exported to \'',REP3_DEFNAME,'\'.)'))
	# Print JSON info
	printer('\n\nSummary Stats (summary.json):\n')
	printer(prtjson)
	printer('\n')
}

mco2_err_msg <- function(int,next_state) {
	switch(
		int,
		'err1.1'=printer('\nError: You have already loaded the data file.\n'),
		'err1.2'=printer(paste0('\nError: \'',DEFAULT_CSV_LOC,'\' does not exist.\n')),
		'err2.1'=printer('\nError: You must load the data file first before generating a report.\n'),
		printer('\nUnknown error.\n')
	)
	return(next_state)
}

mco2_state1 <- function() {
	if (length(DATA_FRAME)>1)
		return(mco2_err_msg('err1.1',0))
	if (is.na(DATA_FRAME)) {
		if (!file.exists(DEFAULT_CSV_LOC))
			return(mco2_err_msg('err1.2',0))
		printer('\nProcessing dataset from 2021-2023...')
		DATA_FRAME<<-load_file(DEFAULT_CSV_LOC)
		prtrows<-prettyNum(DATA_FRAME$rows,big.mark=',',scientific=FALSE)
		prtrowsf<-prettyNum(DATA_FRAME$frows,big.mark=',',scientific=FALSE)
		printer(paste0('\nLoaded ',prtrowsf,' of ',prtrows,' rows from data file of funding year 2021-2023.\n'))
		return(0)
	}
	return(mco2_err_msg(NA,0))
}

mco2_state2 <- function() {
	if (length(DATA_FRAME)==1)
		if (is.na(DATA_FRAME))
			return(mco2_err_msg('err2.1',0))
		else
			return(mco2_err_msg(NA,0))
	gen_rep(DATA_FRAME)
	return(0)
}

mco2_state3 <- function() {
	return(-1)
}

main <- function() {
	state<-0
	while (state!=-1) {
		printer(paste(sep='\n',
			'\nSelect language implementation:',
			'[1] Load data file...',
			'[2] Generate Reports...',
			'[3] Exit',
			''
		))
		uprompt<-force_numeric(prompter('\nSelect an option: '))
		if (!is.na(uprompt)&&uprompt>0&&uprompt<=3) {
			state<-switch(
				uprompt,
				mco2_state1(),
				mco2_state2(),
				mco2_state3(),
				0
			)
		}
	}
}

main()