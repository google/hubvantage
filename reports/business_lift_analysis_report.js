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
 * Returns Brand Lift report object.
 * @return {!Object} Report Config Object
 */
function getBrandLiftAnalysisReport() {
  return {
    name: SUPPORTED_REPORTS.BRAND_SURVEY_ANALYSIS,
    reportParams: [
      {
        displayParamName: 'CM Advertiser IDs - Brand',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS,
      },
      {
        displayParamName: 'CM Campaign IDs - Brand',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS
      },
      {
        displayParamName: 'CM Site IDs - Brand',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS
      },
      {
        displayParamName: 'CM Advertiser ID - Survey (enter 1 value only)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.POSITIVE_NUMBER
      },
      {
        displayParamName: 'CM Campaign ID - Survey (enter 1 value only)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.POSITIVE_NUMBER
      },
      {
        displayParamName: 'Exposure Level for "Expose" Group',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.POSITIVE_NUMBER
      }
    ],
    renderAdditionalSections: function (
      sheetName, startRowNum, headerColor, fieldColor) {
      headerCellBlock = 'A' + startRowNum + ':E' + startRowNum;
      writeValue(sheetName, headerCellBlock, 'Survey Question Mapping',
        'bold', 10, 'normal', headerColor);
      fieldRowNum = startRowNum + 1
      writeValue(sheetName, 'A' + fieldRowNum, 'Impact Area', 'normal', 10,
        'italic', fieldColor);
      writeValue(sheetName, 'B' + fieldRowNum, 'Question Id', 'normal', 10,
        'italic', fieldColor);
      writeValue(sheetName, 'C' + fieldRowNum, 'Question Text', 'normal', 10,
        'italic', fieldColor);
      writeValue(sheetName, 'D' + fieldRowNum, 'Option Id', 'normal', 10,
        'italic', fieldColor);
      writeValue(sheetName, 'E' + fieldRowNum, 'Option Text', 'normal', 10,
        'italic', fieldColor);
    },
    jobs: function (configVals) {
      return [getBrandLiftJob()];
    }
  }
}
