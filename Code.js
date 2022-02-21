function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  var url = ScriptApp.getService().getUrl();
  template.url = url;
  var output = template.evaluate();
  return output;
}

function doPost(e) {
  return doGet(e);
}

function getData(grade) {
  var cache = CacheService.getUserCache();
  var values = cache.get(grade);
  if (values !== null) {
    return JSON.parse(values);
  }
  try {
    var spreadsheet = SpreadsheetApp.openById('');
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

function getProperty(key) {
  var userProperties = PropertiesService.getUserProperties();
  var value = userProperties.getProperty(key);
  if (value !== null) {
    return JSON.parse(value);
  }
  return null;
}

function setProperty(key, value) {
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