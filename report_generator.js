/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Report Generator uses existing report objects and associated job
 * configuration to run reports on ADH
 */
class ReportGenerator {
  constructor() {
  }

  /**
   * For any supported report, return the SQL query representation from
   * configuration objects.
   * if report type is not supported returns an error message.
   * @param  {string} reportType SUPPORTED_REPORTS enum
   * @return {string} SQL query representation or not supported error
   */
  getQueryTextFromActiveSheet(reportType) {
    //collect input parameters for report template initialization
    let activeSheet = SpreadsheetApp.getActiveSheet();
    let reportConfigSheetName = activeSheet.getName();
    let reportConfigObj = getReportConfigObjFromDisplayString_(reportType);
    //create a report template and nested job object containing query
    let template = new ReportTemplate(
      reportConfigObj.name, reportConfigSheetName);
    let reportParamValues = template.getReportParamVals(
      reportConfigObj.reportParams);
    //TODO:: add support for multiple jobs to display, currently displaying only
    // first one and skipping other
    let jobConfigObj = reportConfigObj.jobs(reportParamValues)[0];
    let queryText = undefined;
    //extract query implementation if exists
    if (jobConfigObj) {
      queryText = jobConfigObj.queryTxt;
    } else {
      queryText = 'Display Query is not supported for this report';
    }
    return queryText;
  }

  /**
   * Collect all configuration parameters needed to run the report on ADH as
   * an ADH Job and runs then using AdhQueryService class.
   * @param  {string} reportConfigSheetName Sheet containing report UI
   * @param  {!Object} reportConfigObj Report Configuration Object
   * @param  {!Array<number>} allowListedCustomerIds Allowed Customer IDs
   * @param  {boolean=} isAdvancedReporting=false Signifies that this is an
   * advanced report (which includes extra sections); it will get special
   * parsing at run time
   */
  run(reportConfigSheetName, reportConfigObj, allowListedCustomerIds,
    isAdvancedReporting = false) {
    let adhExecutionParams = this.getAdhJobExecutionParameters_(
      reportConfigObj, reportConfigSheetName, allowListedCustomerIds,
      isAdvancedReporting);
    //cancel run if job configuration is not well defined
    let jobConfigObjs = adhExecutionParams[0];
    if (!jobConfigObjs || jobConfigObjs.length === 0) {
      return;
    }
    // run defined batch of jobs on ADH
    let adhService = new AdhQueryService();
    let jobNames = [];
    for (let jobConfigObj of jobConfigObjs) {
      let jobName = this.runADHJob_(adhService, jobConfigObj,
        adhExecutionParams);
      //collect successful initialization of jobs on ADH
      jobNames.push(jobName);
    }
    // store all successful jobnames as metadata
    this.storeJobNames_(reportConfigSheetName, jobNames);
  }

  /**
   * initializes a report templated for given report, represented by the
   * report config object and extracts all needed parameters to run the
   * report on ADH
   *
   * @private
   * @param {!Object} reportConfigObj Report Configuration Object
   * @param {string} reportConfigSheetName Sheet containing report UI
   * @param {!Array<number>} allowListedCustomerIds Allowed Customer IDs
   * @param {boolean} isAdvancedReporting Signifies that this is an
   * advanced report (which includes extra sections); it will get special
   * parsing at run time
   * @return {!Array<!Object>} jobConfig, queryConfigValues, associated
   * report config object, user input configuration parameters
   */
  getAdhJobExecutionParameters_(reportConfigObj, reportConfigSheetName,
    allowListedCustomerIds, isAdvancedReporting) {
    let template =
      new ReportTemplate(reportConfigObj.name, reportConfigSheetName);
    //get user input configuration from UI (sheet)
    let queryConfigVals = template.getQueryConfigurationParamVals();
    //check for allowed customer IDs
    let adsDataCustomerId = queryConfigVals[0];
    if (ENABLE_CUSTOMER_ALLOWLLIST &&
      !allowListedCustomerIds.includes(adsDataCustomerId)) {
      throw new Error(`This ADH Customer ID ${adsDataCustomerId} ` +
        `is not on the allowlist. Please contact internal team.`);
    }
    //get report predefined parameters and job configurations
    let reportParamVals =
      template.getReportParamVals(reportConfigObj.reportParams);
    let jobConfigObjs = reportConfigObj.jobs(reportParamVals) || [];

    //get job configuration for dynamic reports
    if (isAdvancedReporting === true) {
      jobConfigObjs = template.getAdvancedReportQueryImplementation(
        reportConfigObj.name.toString(),
        reportConfigSheetName,
        reportParamVals);
    }
    //collection of parameters needed to run report on ADH
    return [
      jobConfigObjs,
      queryConfigVals,
      reportConfigObj,
      reportParamVals,
      template
    ];
  }
  /**
   * Start an ADH job from config and parameter objects and log successful
   * runs. Fail entire report if encounter an error from one of the jobs
   * constructing the report.
   *
   * @private
   * @param {!AdhQueryService} adhService Service class to query the ADH API
   * @param {!Object<string, *>} jobConfigObj Job configuration parameters
   * @param {Array<Object>} adhExecutionParams ADH job parameters
   * (jobConfigObjs, queryConfigVals, reportConfigObj, reportParamVals)
   *
   * @return {string} successful job job name triggered on ADH
   */
  runADHJob_(adhService, jobConfigObj, adhExecutionParams) {

    let queryConfigVals = adhExecutionParams[1];
    let reportConfigObj = adhExecutionParams[2];
    let reportParamVals = adhExecutionParams[3];
    let template = adhExecutionParams[4];

    try {
      //execute job on ADH and log successful run
      let [resp, json] = adhService.execute(jobConfigObj, reportConfigObj,
        queryConfigVals, reportParamVals);
      if (resp.getResponseCode() === ADH_JOB_SUCCESS) {
        //return successful job init on ADH
        return json.name;
      } else {
        let alerts = resp.getContentText();
        throw new Error(alerts);
      }
    } catch (ex) {
      console.error(`Error running job: ${jobConfigObj.queryName} ` +
        `\nError: ${ex}`);
      this.setFailureJobStatus_(template, ex.message);
      throw new Error(`There was an error in this report. Error: ${ex}`);
    }
  }

  /**
   * Display error message from response in UI (sheet)
   *
   * @private
   * @param {!ReportTemplate} template
   * @param {string} alert
   */
  setFailureJobStatus_(template, alert) {
    let time = new Date();
    let alerts = JSON.stringify(alert);
    let status = ADH_JOB_FAILURE;
    template.setExecutionDetails(time, status, alerts);
  }
  /**
   * Check job status on ADH and update status in UI (sheet)
   *
   * @param {string} reportConfigSheetName
   * @param {!Object<string, *>} reportConfigObj
   */
  refreshLastRunJobStatus(reportConfigSheetName, reportConfigObj) {
    let adh = new AdhQueryService();
    let jobNames = this.retrieveJobNames_(reportConfigSheetName);
    if (!jobNames || jobNames.length === 0) {
      return;
    }
    // set the "base" execution details for this report. A report execution
    // can be made up of multiple ADH jobs. There was at least one job name
    // in the metadata array so these variables will be updated at least
    // once
    let reportEndTime = new Date('1970-01-01');
    let reportStatus = ADH_JOB_SUCCESS;
    let reportErrors = [];
    jobNames.forEach(jobName => {
      // get return stats for a particular job
      let [jobEndTime, jobStatus, jobAlert] = adh.getJobExecutionStatus(
        jobName);
      if (jobStatus === ADH_JOB_FAILURE) {
        // if this job failed then the entire report failed
        reportStatus = ADH_JOB_FAILURE;
        reportErrors.push(jobAlert);
      } else if (jobStatus === ADH_JOB_RUNNING &&
        reportStatus !== ADH_JOB_FAILURE) {
        // if job is still running and the report hasn't failed (due to
        // another job failing) then the report is still running
        reportStatus = ADH_JOB_RUNNING;
      }
      // if the job is successful then we don't need to do anything because
      // reportStatus was initialized as SUCCESS and the other two values
      // (FAILURE and RUNNING) take priority.
      if (jobEndTime && jobEndTime > reportEndTime) {
        // reportEndTime will be the latest job end time
        reportEndTime = jobEndTime;
      }
    });
    // default end time is 1970. If the report is still running then reset
    // the end time to null.
    if (reportStatus === ADH_JOB_RUNNING) {
      reportEndTime = null;
    }

    let template =
      new ReportTemplate(reportConfigObj.name, reportConfigSheetName);
    // update the report summary.
    // reportErrors is array of text of error(s) so create a string
    template.setExecutionDetails(reportEndTime, reportStatus,
      reportErrors.join('\n'));
  }

  /**
   * Get previously successfully ran jobs from sheet level metadata
   *
   * @private
   * @param {string} reportConfigSheetName
   * @return {!Array<string>} Job names
   */
  retrieveJobNames_(reportConfigSheetName) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(reportConfigSheetName);
    let jobNames = [];
    if (sheet) {
      sheet.getDeveloperMetadata().forEach(devMeta => {
        if (devMeta.getKey() === JOB_NAMES_METADATA_KEY) {
          jobNames = JSON.parse(devMeta.getValue());
        }
      });
    }
    return jobNames;
  }

  /**
   * Store successfully ran job on sheet level metadata for later use
   * (refresh or rerun)
   *
   * @private
   * @param {string} reportConfigSheetName
   * @param {!Array<string>} jobNames
   */
  storeJobNames_(reportConfigSheetName, jobNames) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(reportConfigSheetName);
    if (sheet) {
      sheet.getDeveloperMetadata().forEach(devMeta => {
        if (devMeta.getKey() === JOB_NAMES_METADATA_KEY) {
          devMeta.remove();
        }
      });
      sheet.addDeveloperMetadata(JOB_NAMES_METADATA_KEY,
        JSON.stringify(jobNames));
    }
  }
}
