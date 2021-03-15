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
 * Auxiliary object to to run test functions and summarize test outcomes.
 * test functions are part of a predefined object that is passed to the
 * "run tests" function.
 *
 * All methods are declared as part of an object to increase readability. This
 * object serves as a namespace due to GAS limitations.
 */
let Assert = {
  /**
   * @param  {Object} testObject object listing unit tests functions
   * @param  {bool} isNoExceptionOutcome=false log success when no exceptions
   *         occur
   */
  runTests: function(testObject, isNoExceptionOutcome = false) {
    let propertyNames = Object.keys(testObject);
    propertyNames.forEach(p => {
      let functionProperty = testObject[p];
      if (typeof functionProperty === 'function') {
        try {
          functionProperty.apply(testObject);
          if (isNoExceptionOutcome === true) {
            console.info(`${functionProperty.name} test passed`);
          }
        } catch (exception) {
          console.error(
            `${exception.message}. stack: ${exception.stack}`);
        }
      }
    });
  },

  /**
   * Logs if the test passed or failed based on if the expected and actual
   * results are equal
   * @param  {any} actualResult
   * @param  {any} expectedResult
   * @param  {string} callerFunctionName
   */
  isEqual: function(actualResult, expectedResult, callerFunctionName) {
    if (actualResult === expectedResult) {
      console.info(`${callerFunctionName} test passed`);
    } else {
      console.warn(`${callerFunctionName} test failed`);
    }
  },

  /**
   * Logs if the test passed or failed based on if the expected result has a
   * falsy value: the number 0, null, undefined, boolean false, the number NAN,
   * empty string "" (or equivalent '' or ``)
   * @param  {any} actualResult
   * @param  {string} callerFunctionName
   */
  isFalsyValue: function(actualResult, callerFunctionName){
    if (!actualResult) {
      console.info(`${callerFunctionName} test passed`);
    } else {
      console.warn(`${callerFunctionName} test failed`);
    }
  },

  /**
   * Logs if the test passed or failed based on if the expected result is not a
   * falsy value. the following will fail the test: the number 0, null,
   * undefined, boolean false, the number NAN, empty string ""
   * (or equivalent '' or ``)
   * @param  {any} actualResult
   * @param  {string} callerFunctionName
   */
  isNotFalsyValue: function(actualResult, callerFunctionName){
    if (actualResult) {
      console.info(`${callerFunctionName} test passed`);
    } else {
      console.warn(`${callerFunctionName} test failed`);
    }
  }
}
