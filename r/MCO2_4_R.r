# If 'tidyverse' is old or not installed yet, uncomment the below line for this code to work.
# Once 'tidyverse' is already installed on the first run, it can be commented again so
# that it would not download 1.2MB over and over.
#suppressMessages(install.packages('tidyverse',repos='https://cloud.r-project.org'))
suppressMessages(library(tidyverse))
suppressMessages(library(data.table))
suppressMessages(library(stringr))
options(width=1000)

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

load_file <- function(csv_path_to_file) {
	CSV_DATA <- smw(read_csv(csv_path_to_file))
	CSV_DATA <- smw(CSV_DATA %>%
		filter(
			!is.na(force_numeric(ApprovedBudgetForContract)) &
			!is.na(force_numeric(ContractCost)) &
			!is.na(force_numeric(ProvincialCapitalLatitude)) &
			!is.na(force_numeric(ProvincialCapitalLongitude))
		)
	)
	CSV_DATA <- CSV_DATA %>%
		filter(FundingYear>=2021 & FundingYear<=2023)
	CSV_ROWS<-nrow(CSV_DATA)
	return(list(content=CSV_DATA,rows=CSV_ROWS))
}

main <- function() {
	data_frame <- load_file('..\\data\\dpwh_flood_control_projects.csv')
	rep1 <- report1(data_frame$content)
	rep2 <- report2(data_frame$content)
	rep3 <- report3(data_frame$content)
	print.data.frame(rep1$content)
	printer('\n')
	print.data.frame(rep2$content)
	printer('\n')
	print.data.frame(rep3$content)
}

main()