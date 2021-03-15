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
 * Returns a Reach and Frequency v2 report object.
 * The v2 version has added support for Google Ads as well as the previously
 * supported CM and DV360. It also supports both platforms - web and app.
 * @return {!Object} Report Config Object
 */
function getRnfReportV2() {
  return {
    name: SUPPORTED_REPORTS.RF_ANALYSIS_V2,
    jobs: function (configValues) {
      let analysisType = configValues[0];
      let dataSource = configValues[1];
      return getJobsByAnalysisTypeAndDataSource_(analysisType, dataSource);
    },
    reportParams: [
      {
        displayParamName: 'Analysis Type',
        paramType: PARAM_TYPE.DROPDOWN,
        values: ['App', 'Web', 'Both'],
        valueType: VALUE_TYPE.ARRAY_OF_STRINGS,
      },
      {
        displayParamName: 'Data Source',
        paramType: PARAM_TYPE.DROPDOWN,
        values: ['Campaign Manager', 'DV360', 'Google Ads'],
        valueType: VALUE_TYPE.ARRAY_OF_STRINGS,
      },
      {
        displayParamName: 'Advertiser IDs',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS
      },
      {
        displayParamName: 'Campaign IDs',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS
      }
    ]
  };
  /**
   * Given an Analysis Type and a data source construct an array of jobs to run
   * on ADH as part of a complete report
   * @param  {string} analysisType defined by user input App\Web\Both
   * @param  {string} dataSource defined by user input
   *         Campaign Manager\DV360\Google Ads
   * @return {Array<Object>} array of jobs defined in report job object
   */
  function getJobsByAnalysisTypeAndDataSource_(analysisType, dataSource) {
    switch (analysisType) {
      case 'App':
        return getAppAnalysisJobsByDataSource_(dataSource);
      case 'Web':
        return getWebAnalysisJobsByDataSource_(dataSource);
      case 'Both':
        return getAppAndWebJobsByDataSource_(dataSource);
    }
  }

  /**
  * Given a data source construct an array of jobs to run on ADH as part of a
  * complete report: App and Web based analysis jobs
  * @param  {string} dataSource defined by user input
  *         Campaign Manager\DV360\Google Ads
  * @return {Array<Object>} array of jobs defined in report job object
  */
  function getAppAndWebJobsByDataSource_(dataSource) {
    switch (dataSource) {
      case 'Campaign Manager':
        return [getAllCmRnfJob(), getAllCmRnfOverlapJob()];
      case 'DV360':
        return [getAllDV360RnfJob(), getAllDV360RnfOverlapJob()];
      case 'Google Ads':
        return [getAllGaRnfJob(), getAllGARnfOverlapJob()];
    }
  }
  /**
  * Given a data source construct an array of jobs to run on ADH as part of a
  * complete report: Web Based analysis jobs
  * @param  {string} dataSource defined by user input
  *         Campaign Manager\DV360\Google Ads
  * @return {Array<Object>} array of jobs defined in report job object
  */
  function getWebAnalysisJobsByDataSource_(dataSource) {
    switch (dataSource) {
      case 'Campaign Manager':
        return [getWebCmRnfJob(), getWebCmRnfOverlapJob()];
      case 'DV360':
        return [getWebDV360RnfJob(), getWebDV360RnfOverlapJob()];
      case 'Google Ads':
        return [getWebGaRnfJob(), getWebGaRnfOverlapJob()];
    }
  }

  /**
  * Given a data source construct an array of jobs to run on ADH as part of a
  * complete report: App analysis jobs
  * @param  {string} dataSource defined by user input
  *         Campaign Manager\DV360\Google Ads
  * @return {Array<Object>} array of jobs defined in report job object
  */
  function getAppAnalysisJobsByDataSource_(dataSource) {
    switch (dataSource) {
      case 'Campaign Manager':
        return [getAppCmRnfJob(), getAppCmRnfOverlapJob()];
      case 'DV360':
        return [getAppDV360RnfJob(), getAppDV360RnfOverlapJob()];
      case 'Google Ads':
        return [getAppGaRnfJob(), getAppGaRnfOverlapJob()];
    }
  }
}
