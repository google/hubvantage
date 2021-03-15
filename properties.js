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
 * Hubvantage properties list.
 */
// Enable allowlisting customers using a Google Sheets spreadsheet.
const ENABLE_CUSTOMER_ALLOWLLIST = false;

// Sheet ID of allowed customers when ENABLE_CUSTOMER_ALLOWLLIST is set true.
const CUSTOMERS_ALLOWLIST_SHEET_ID = '';

// Sheet ID of whitlisted customers
const INTEGRATION_TEST_SHEET_ID = '';

// Sheet ID of integration test customer id.
const INTEGRATION_TEST_CUSTOMER_ID = '';

// Sheet ID of integration test primary customer id.
const INTEGRATION_TEST_PRIMARY_CUSTOMER_ID = '';

// Full BigQuery Table name for integration test results.
const INTEGRATION_TEST_BQ_RESULT_TABLE_PREFIX = '';
