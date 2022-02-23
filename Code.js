function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  var url = ScriptApp.getService().getUrl();
  template.url = url;
  var output = template.evaluate();
  return output;
}

function getData(grade) {
  var cache = CacheService.getUserCache();
  var values = cache.get(grade);
  if (values !== null) {
    return JSON.parse(values);
  }
  try {
    var spreadsheet = SpreadsheetApp.openById('13Y87ZXg57DuuYDRs-9VUzMA3rRKVZAgH5JjJJd5QGYQ');
    var sheet = spreadsheet.getSheetByName(grade);
    if (sheet === null) {
      throw 'there is no sheet with the given name.';
    }
    var range = sheet.getDataRange();
    values = range.getValues();
    values.shift();
    cache.put(grade, JSON.stringify(values));
    return values;
  } catch (e) {
    logDebug(e);
  }
  return null;
}

function createUserFlashcard() {
  newUserFlashcardFile_();
}

function existUserFlashcard() {
  const file = getUserFlashcardFile_();
  if (file !== null) {
    return true;
  }
  return false;
}

function getFlashcardList() {
  const file = getUserFlashcardFile_();
  const spreadsheet = SpreadsheetApp.open(file);
  const sheets = spreadsheet.getSheets();
  let list = [];
  for (const sheet of sheets) {
    list.push(sheet.getName());
  }
  return list;
}

function fetchFlashcardData(sheetName) {
  const cache = CacheService.getUserCache();
  let values = cache.get(sheetName);
  if (values !== null) {
    return JSON.parse(values);
  }
  const file = getUserFlashcardFile_();
  const spreadsheet = SpreadsheetApp.open(file);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet === null) {
    throw 'there is no sheet with the given name.';
  }
  const range = sheet.getDataRange();
  values = range.getValues();
  values.shift();
  cache.put(sheetName, JSON.stringify(values));
  return values;
}

function getFileById_(id) {
  try {
    return DriveApp.getFileById(id);
  } catch (error) {
    Logger.log(error);
  }
  return null;
}

function getOriginFlashcardFile_() {
  return getFileById_('13Y87ZXg57DuuYDRs-9VUzMA3rRKVZAgH5JjJJd5QGYQ');
}

function newUserFlashcardFile_() {
  const file = getOriginFlashcardFile_().makeCopy();
  setProperty_('id', file.getId());
  return file;
}

function getUserFlashcardFile_() {
  const id = getProperty_('id');
  if (id !== null) {
    const file = getFileById_(id);
    if (file === null) {
      return null;
    }
    if (file.isTrashed()) {
      return null;
    }
    return file;
  }
  return null;
}

function getProperty_(key) {
  var userProperties = PropertiesService.getUserProperties();
  var value = userProperties.getProperty(key);
  return JSON.parse(value);
}

function setProperty_(key, value) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(key, JSON.stringify(value));
}

function logUserInfo() {
  var email = Session.getActiveUser().getEmail();
  var userProperties = PropertiesService.getUserProperties();
  var properties = userProperties.getProperties();
  Logger.log('Active user Email: %s\nUser properties: %s', email, properties);
}

function logDebug(msg) {
  Logger.log(msg);
  return msg;
}