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
 * Reads value from given sheet name and A1 notation cell location
 * @param  {string} sheetName
 * @param  {string} cellLoc
 * @return {!Object}
 */
function readvalue(sheetName, cellLoc) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw("Cannot find sheet with name : " + sheetName);
  }
  return sheet.getRange(cellLoc).getValue();
}

/**
 * Internal function that writes a value to given cell location in sheet by
 * given name and sets text formatting.
 * @param  {string} sheetName
 * @param  {string} cellLoc
 * @param  {string} value
 * @param  {string=} fontWeight
 * @param  {number=} fontSize
 * @param  {string=} fontStyle
 * @param  {string} backgroundColor
 * @param  {?DataValidation} validationRule
 * @param  {string} cellFormat
 * @param  {string=} horizontalAlignment
 * @return {!Range} The cell location that was written to.
 */
function _writeValue(sheetName, cellLoc, value, fontWeight = 'normal',
    fontSize = 10, fontStyle = 'normal', backgroundColor, validationRule,
    cellFormat, horizontalAlignment = "left") {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw("Cannot find sheet with name : " + sheetName);
  }
  let range = sheet.getRange(cellLoc);
  if (backgroundColor) {
    range.setBackground(backgroundColor);
  }
  let cell = range.getCell(1, 1);
  cell.setValue(value)
      .setFontWeight(fontWeight)
      .setFontSize(fontSize)
      .setFontFamily(TEXT_FONT)
      .setFontStyle(fontStyle);
  if (validationRule) {
    cell.setDataValidation(validationRule);
  }
  if (cellFormat) {
    cell.setNumberFormat(cellFormat);
  }
  if (horizontalAlignment) {
    cell.setHorizontalAlignment(horizontalAlignment);
  }
  return cell;
}

/**
 * Writes value to given cell location in sheet by given name and sets text
 * formatting.
 * This provides an external entry to the similarly named internal function.
 * @param  {string} sheetName
 * @param  {string} cellLoc
 * @param  {string} value
 * @param  {string=} fontWeight
 * @param  {number=} fontSize
 * @param  {string=} fontStyle
 * @param  {string} backgroundColor
 * @param  {?DataValidation} validationRule
 * @param  {string} cellFormat
 * @param  {string=} horizontalAlignment
 * @return {!Range} The cell location that was written to.
 */
function writeValue(sheetName, cellLoc, value, fontWeight,
  fontSize, fontStyle, backgroundColor, validationRule,
  cellFormat, horizontalAlignment) {
  _writeValue(sheetName, cellLoc, value, fontWeight,
    fontSize, fontStyle, backgroundColor, validationRule,
    cellFormat, horizontalAlignment)
}

/**
 * Writes value to given cell location in sheet by given name with predefined
 * formatting that represents a header.
 * Formatting: Bold font, size 10, not italic, light grey background color.
 * @param  {string} sheetName
 * @param  {string} cellLoc
 * @param  {string} value
 * @return {!Range}
 */
function writeBoldHeaderBackground(sheetName, cellLoc, value) {
  return this._writeValue(
      sheetName,
      cellLoc,
      value,
      'bold',
      10,
      'normal',
      HEADER_BG_COLOR);
}

/**
 * Writes value to given cell location in sheet by given name with predefined
 * formatting that represents plain text and applies validation rule.
 * Formating: normal font, size 10, not italic, no background color.
 * @param  {string} sheetName
 * @param  {string} cellLoc
 * @param  {string} value
 * @return {!Range}
 */
function writeDefaultTextFormatWithCellFormat(sheetName, cellLoc, value,
    cellFormat){
  return this._writeValue(sheetName, cellLoc, value, 'normal', 10, 'normal',
      null, null, cellFormat);
}

/**
 * Writes value to given cell location in sheet by given name with predefined
 * formatting for sub header.
 * Formatting: not Bold, font size 10, italic, no background color.
 * @param  {string} sheetName
 * @param  {string} cellLoc
 * @param  {string} value
 * @return {!Range}
 */
function writeItalicFieldBackground(sheetName, cellLoc, value) {
  return this._writeValue(
      sheetName,
      cellLoc,
      value,
      'normal',
      10,
      'italic',
      FIELD_BG_COLOR);
}

/**
 * Writes value to given cell location in sheet by given name with predefined
 * formatting for plain text.
 * Formatting: not Bold, font size 10, not italic, whitesmoke background color.
 * @param  {string} sheetName
 * @param  {string} cellLoc
 * @param  {string} value
 * @return {!Range}
 */
function writeDefaultTextFormat(sheetName, cellLoc, value) {
  return this._writeValue(
    sheetName,
    cellLoc,
    value,
    'normal',
    10,
    'normal');
}

/**
 * Sets cell format and data validation for a given range by value type
 * @param  {!Range} range
 * @param  {!PARAM_TYPE} paramType
 * @param  {!VALUE_TYPE} valueType
 * @param  {!Array<number|string>=} values
 */
function setRangeFormatting(range, paramType, valueType, values = []) {
  let validationRule = SpreadsheetApp.newDataValidation();
  if (paramType == PARAM_TYPE.DROPDOWN) {
    validationRule = validationRule.requireValueInList(values)
        .setAllowInvalid(false).build();
    range.setDataValidation(validationRule);
    range.setFontSize(10).setFontFamily(TEXT_FONT);
    range.setNumberFormat('@');
  } else {
    switch (valueType) {
      case VALUE_TYPE.DATE:
        range.setNumberFormat("dd-mm-yyyy");
        validationRule = validationRule.requireDate()
            .setAllowInvalid(false)
            .build();
        range.setDataValidation(validationRule);
        break;
      case VALUE_TYPE.NUMBER:
        range.setNumberFormat("#");
        validationRule = validationRule
            .requireNumberGreaterThan(-999999999999999)
            .setAllowInvalid(false)
            .build();
        range.setDataValidation(validationRule);
        break;
      case VALUE_TYPE.POSITIVE_NUMBER:
        range.setNumberFormat("#");
        validationRule = validationRule.requireNumberGreaterThan(0)
            .setAllowInvalid(false)
            .build();
        range.setDataValidation(validationRule);
        break;
      case VALUE_TYPE.STRING:
        range.setNumberFormat("@");
        break;
      case VALUE_TYPE.ARRAY_OF_NUMBERS:
        range.setNumberFormat("@");
        break;
      case VALUE_TYPE.ARRAY_OF_STRINGS:
        range.setNumberFormat("@");
        break;
    }
  }
  range.setHorizontalAlignment("left");
}
