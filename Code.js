function doGet(e) {
  console.log(e);

  // setVersion(0.1);
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('id');
  // userProperties.deleteProperty('id');

  updatePacksInfo();

  if (e.parameters['copy']) {
    handleCopy(e.parameters['copy']);
  }

  let template = HtmlService.createTemplateFromFile('index');
  const url = ScriptApp.getService().getUrl();
  template.url = url;
  const output = template.evaluate();
  return output;
}

// function setVersion(v) {
//   try {
//     const lock = LockService.getUserLock();
//     lock.waitLock(10000);

//     const currentVersion = getProperty_('version');
//     if (currentVersion !== v) {
//       const userProperties = PropertiesService.getUserProperties();
//       userProperties.deleteProperty('id');

//       setProperty_('version', 0.1);
//     }

//     lock.releaseLock();
//   } catch (error) {
//     console.log('Could not obtain lock after 10 seconds.');
//     throw error;
//   }
// }

function handleCopy(parameters) {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    let infList = getPropertyList_();
    // console.log(infList);
    for (const parameter of parameters) {
      if (!infList.find(inf => new PackInfo(inf).parent === parameter)) {
        const file = getFileById_(parameter).makeCopy();
        let inf = new PackInfo();
        inf.parent = parameter;
        inf.id = file.getId();
        infList.push(inf);
      }
    }
    setProperty_('list', infList);

    lock.releaseLock();
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }
}

function updatePacksInfo() {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    let infList = getPropertyList_();
    infList = infList.filter((inf) => existFile_(inf.id));
    // console.log(infList);
    setProperty_('list', infList);

    lock.releaseLock();
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }

}

function getPacks() {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    const infList = getPropertyList_();
    const packs = infList.map((inf) => {
      const file = getFileById_(inf.id);
      if (file !== null) {
        return new Pack(inf.id, file.getName(), file.getUrl(), inf.parent);
      }
    });

    lock.releaseLock();

    return packs;
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }
}

function getDecks(pack) {
  const file = getFileById_(pack);
  const spreadsheet = SpreadsheetApp.open(file);
  const sheets = spreadsheet.getSheets();
  const decks = sheets.map((sheet) => {
    return new Deck(sheet.getSheetId(), sheet.getName());
  });
  return decks;
}

function getCards(pack, deck) {
  const file = getFileById_(pack);
  const spreadsheet = SpreadsheetApp.open(file);
  const sheet = spreadsheet.getSheetByName(deck);

  // const cache = CacheService.getUserCache();
  // let values = cache.get(sheetName);
  // if (values !== null) {
  //   return JSON.parse(values);
  // }

  if (sheet === null) {
    throw 'there is no sheet with the given name.';
  }

  // for debug
  // 一時的な検証結果
  // DeveloperMetadata は Sheet 単位に保持する
  // 実装をかんたんにするため。

  const range = sheet.getDataRange();
  values = range.getValues();
  if (values.length === 0) {
    return null;
  }
  values.shift();
  if (values.length === 0) {
    return [];
  }

  console.log(sheet.getDeveloperMetadata().map((data) => {
    return {
      id: data.getId(),
      key: data.getKey(),
      value: data.getValue()
    };
  }));

  // sheet.getDeveloperMetadata().map((data) => {
  //   data.remove();
  // });

  const metadata = sheet.getDeveloperMetadata().map((data) => {
    return new CardMetaData(data.getValue());
  });
  console.log(metadata);

  const cards = values.map((value) => {
    return new Card(value[0], value[1], value[2], value[3], value[4], value[5]);
  });
  // cache.put(sheetName, JSON.stringify(values));
  return cards;
}

function initMetadata(sheet) {
  let metadata = sheet.getDeveloperMetadata();
}

function existFile_(id) {
  return getFileById_(id) !== null;
}

function getFileById_(id) {
  try {
    const file = DriveApp.getFileById(id);
    if (file !== null) {
      if (!file.isTrashed()) {
        return file;
      }
    }
  } catch (error) {
    console.log(error);
  }
  return null;
}

function getPropertyList_() {
  let list = getProperty_('list');
  if (list === null) {
    return [];
  }
  return list.map(value => new PackInfo(value));
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

class Card {
  constructor(id, front, back, efact, n, i) {
    this.id = id;
    this.front = front;
    this.back = back;
    this.efact = efact;
    this.n = n;
    this.i = i;
    this.meta = null;
  }
}

class Deck {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.cards = null;
  }
}

class Pack {
  constructor(id, name, url, parent) {
    this.id = id;
    this.name = name;
    this.url = url
    this.decks = null;
    this.parent = parent;
  }
}

class CardMetaData {
  constructor(metadata) {
    console.log(metadata);
    metadata = JSON.parse(metadata);
    console.log(metadata);
    // this.e = !metadata ? null : metadata.e;
    // this.n = !metadata ? null : metadata.n;
    // this.i = !metadata ? null : metadata.i;
    // this.l = !metadata ? null : metadata.l;
  }
  get efact() {
    return this.e;
  }
  set efact(efact) {
    this.e = efact; 
  }
  get lastRepeat() {
    return new Date(this.l);
  }
  set lastRepeat(date) {
    this.l = data.getTime();
  }
}

class PackInfo {
  constructor(info) {
    this.p = !info ? '' : info.p;
    this.i = !info ? '' : info.i;
  }
  get parent() {
    return this.p;
  }
  set parent(id) {
    this.p = id;
  }
  get id() {
    return this.i;
  }
  set id(id) {
    this.i = id;
  }
}