'use strict';

const chakram = require('chakram');
const expect = chakram.expect;
const qc = require('quickcheck');
const uuidV4 = require('uuid/v4');
const moment = require('moment');

const cfg = require('./etc/config.json');
const testPostData = require('./testpost.json');
const specData = require('./testdata.json');

const urlRoot = 'http://' + cfg.host + ':' + cfg.port + '/' + cfg.apiRoot;

// generate test data
const idArr = [];
const usedIds = [];
const looseSubIds = [];

let tId;
const castToNumber = function(num) {
  return parseInt(num, 10);
};

const stringEnumVals = specData.testEnum.split('|');
const intEnumVals = specData.testIntEnum.split('|').map(castToNumber);
const floatEnumVals = specData.testFloatEnum.split('|').map(parseFloat);
const minMaxEr = specData.testMinMax.split('<>').map(castToNumber);
const minMaxStart = minMaxEr[0];
const minMaxEnd = minMaxEr[1];

const randomDate = function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  const m = moment(d);
  return m.format('YYYY-MM-DD');
};

const getSubElement = function getSubElement() {
  return {
        subId: qc.arbByte(),
        subString: qc.arbString(),
        subInt: qc.arbByte(),
      };
};

const startDate = new Date(1000, 0, 0);
const endDate = new Date(3000, 0, 0);

idArr.push(testPostData);
usedIds.push(testPostData.testId);

for (let i = 0; i <= 20; i++) {
  tId = qc.arbByte();
  if (usedIds.indexOf(tId) !== -1) {
    continue;
  }

  // add loose sub ids
  const looseSub = {
        subId: tId,
        subString: qc.arbString(),
        subInt: qc.arbByte(),
      };
  looseSubIds.push(looseSub);

  usedIds.push(tId);

  const tdata = {
      testId: tId,
      testInt: qc.arbInt(),
      testFloat: qc.arbDouble(),
      testString: qc.arbString(),
      testUUID: uuidV4(),
      testEmail: qc.arbString().slice(10) + '@' + qc.arbString().slice(10) + '.com',
      testDate: randomDate(startDate, endDate),
      testEnum: stringEnumVals[Math.floor(Math.random() * stringEnumVals.length)],
      testIntEnum: intEnumVals[Math.floor(Math.random() * intEnumVals.length)],
      testFloatEnum: floatEnumVals[Math.floor(Math.random() * floatEnumVals.length)],
      testIntArray: qc.arbArray(qc.arbInt),
      testStringarray: qc.arbArray(qc.arbString),
      testFloatArray: qc.arbArray(qc.arbDouble),
      testMinMax: minMaxStart + Math.floor(Math.random() * (minMaxEnd - minMaxStart)),
      testSubElement: [],
    };
  const subIds = [];

  for (let j = 0; j <= 5; j++) {
    const tSub = getSubElement();
    if (subIds.indexOf(tSub.subId) !== -1) {
      continue;
    }

    subIds.push(tSub.subId);
    tdata.testSubElement.push(tSub);
  }

  idArr.push(tdata);
}

// start the test
describe('Dragonfruit', function() {

  /*const postResponses = [];


  before('populate database with known and generated entities', function() {

    //chakram.post(urlRoot, testPostData);

    var postIt = function(tdata) {
      postResponses.push(chakram.post(urlRoot, tdata));
    };

    idArr.forEach(postIt);

    return chakram.all(postResponses).then(validateCreate);
  }
);*/

  // reusable tests
  const expectGenericSuccess = function(expectIt) {
    expectIt.to.have.status(200);
    expectIt.to.have.json('meta.responseCode', 200);
    expectIt.to.have.json('meta.responseMessage', 'Ok.');
    expectIt.to.have.header('content-type', /json/);

  };

  const expect404 = function(resp) {
    const txt = resp.body;

    expect(resp).to.have.status(404);
    expect(txt).to.equal('Entity not found.');
  };

  const expectGetSuccess = function(resp) {
    const results = resp.body.results;
    const meta = resp.body.meta;
    expect(results).to.be.an('array');
    expect(meta.count).to.equal(results.length);
    expect(meta.total).to.be.at.least(results.length);
  };

  const singleResponse = function(resp, obj) {
    const entity = resp.body.results[0];
    const meta = resp.body.meta;
    expect(meta.count).to.equal(1);

    for (const key in entity) {
      expect(entity[key]).to.deep.equal(obj[key]);
    }
  };

  const expect409 = function(resp) {
    expect(resp).to.have.status(409);
  };

  // test the collection and queries.
  it('should successfully call the collection get API', function() {
    const tester = function(resp) {
      const expectIt = expect(resp);

      expectGenericSuccess(expectIt);
      expectGetSuccess(resp);
    };

    return chakram.get(urlRoot).then(tester);
  });

  const testGets = function(elem) {

    // test a single entity
    it('should return a single entity and subEntity for id #' + elem.testId, function() {
      const validateCreate = function(resp) {
        expect(resp).to.have.status(201);

        return chakram.get(urlRoot + '/' + elem.testId);
      };

      const mainTester = function(resp) {
        const expectIt = expect(resp);
        expectGenericSuccess(expectIt);
        expectGetSuccess(resp);
        singleResponse(resp, elem);
        return chakram.get(urlRoot + '/' + elem.testId + '/testSubElements/');
      };

      const subElementCollectionTester = function(resp) {
        const expectIt = expect(resp);
        expectGenericSuccess(expectIt);
        expectGetSuccess(resp);
        expect(resp.body.results.length).to.equal(elem.testSubElement.length);
        return chakram.get(urlRoot + '/' + elem.testId + '/testSubElements/' + elem.testSubElement[0].subId);

      };

      const subTester = function(resp) {
        const expectIt = expect(resp);
        expectGenericSuccess(expectIt);
        expectGetSuccess(resp);
        singleResponse(resp, elem.testSubElement[0]);
      };

      return chakram.post(urlRoot, elem)
        .then(validateCreate)
        .then(mainTester)
        .then(subElementCollectionTester)
        .then(subTester);
    });

  };

  idArr.forEach(testGets);

  const testSubPosts = function(elem) {
    it('should be able to post sub entities for entity id #' + elem.testId, function() {
      const subIds = [];
      const subElems = [];

      const getAllSubIDs = function(subelem) {
        subIds.push(subelem.subId);
      };

      elem.testSubElement.forEach(getAllSubIDs);
      for (let i = 0; i <= 5; i++) {
        const subel = getSubElement();
        if (subIds.indexOf(subel.subId) !== -1) {
          continue;
        }

        subElems.push(subel);
      }

      const pushSubEl = function(subelem) {
        const validateCreate = function(resp) {

          expect(resp).to.have.status(201);

          return chakram.get(urlRoot + '/' + elem.testId + '/testSubElements/' + subelem.subId);
        };

        const mainTester = function(resp) {
          const expectIt = expect(resp);

          expectGenericSuccess(expectIt);
          expectGetSuccess(resp);
          singleResponse(resp, subelem);
        };

        return chakram.post(urlRoot + '/' + elem.testId + '/testSubElements/', subelem)
          .then(validateCreate)
          .then(mainTester);
      };

      subElems.forEach(pushSubEl);
    });
  };

  idArr.forEach(testSubPosts);

  const testSubPuts = function(elem) {
    it('should be able to alter sub entities for entity id #' + elem.testId, function() {

      const mainTester = function(resp) {
        const expectIt = expect(resp);
        const dataArr = resp.body.results;

        const testPut = function(subelem) {
          const newElem = {};
          newElem.subId = subelem.subId;
          newElem.testString = qc.arbString();
          newElem.subInt = qc.arbByte();

          const validateSubPut = function(resp) {
            const subExpectIt = expect(resp);

            expectGenericSuccess(subExpectIt);
            singleResponse(resp, newElem);
            return chakram.get(urlRoot +
            '/' + elem.testId +
            '/testSubElements/' + subelem.subId);
          };

          const validateNewSubGet = function(resp) {
            const subExpectIt = expect(resp);

            expectGenericSuccess(subExpectIt);
            singleResponse(resp, newElem);
          };

          return chakram.put(urlRoot +
            '/' + elem.testId +
            '/testSubElements/' + subelem.subId, newElem)
            .then(validateSubPut)
            .then(validateNewSubGet);

        };

        expectGenericSuccess(expectIt);
        expectGetSuccess(resp);
        dataArr.forEach(testPut);
      };

      return chakram.get(urlRoot + '/' + elem.testId + '/testSubElements/')
        .then(mainTester);
    });
  };

  idArr.forEach(testSubPuts);

  /* error testing starts here */

  // test get on non-entities
  it('should throw a 404 for a missing entity when performing a get', function() {
      const tester = function(resp) {
        expect404(resp);
      };

      return chakram.get(urlRoot + '/' + 100000).then(tester);
    });

  // test put/patch/delete on non-entities
  const verbs = ['put', 'patch', 'delete'];
  const testMissing = function(verb) {
    it('should throw a 404 for a missing entity when performing a ' + verb, function() {
      return chakram[verb](urlRoot + '/' + 100000, {}).then(expect404);
    });
  };

  verbs.forEach(testMissing);

  // test out of bounds parameters
  it('should throw a 409 for an out of bounds limit parameter', function() {
      return chakram.get(urlRoot + '?limit=200').then(expect409);
    });

  // test out of bounds min-max parameter
  const outOfBounds = [5, 200];
  const testMinMax = function(param) {
    it('should throw a 409 for an out of bounds min max parameter', function() {
      return chakram.get(urlRoot + '?testMinMax=' + param).then(expect409);
    });
  };

  outOfBounds.forEach(testMinMax);

  // test out of bounds int enum
  const nonEnum = [10, 20, 30, 40];
  const testNonEnum = function(param) {
    it('should throw a 409 for an out of bounds int enum parameter', function() {
      return chakram.get(urlRoot + '?testIntEnum=' + param).then(expect409);
    });
  };

  nonEnum.forEach(testNonEnum);

  // test out of bounds float enum
  const nonFloatEnum = [1.3, 2.4, 3.5, 4.6];
  const testNonFloatEnum = function(param) {
    it('should throw a 409 for an out of bounds float enum parameter', function() {
      return chakram.get(urlRoot + '?testFloatEnum=' + param).then(expect409);
    });
  };

  nonFloatEnum.forEach(testNonFloatEnum);

  // test out of bounds float enum
  const nonStringEnum = ['H', 'I', 'J', 'K'];
  const testNonStringEnum = function(param) {
    it('should throw a 409 for an out of bounds string enum parameter', function() {
      return chakram.get(urlRoot + '?testStringEnum=' + param).then(expect409);
    });
  };

  nonStringEnum.forEach(testNonStringEnum);

  // todo - do this with quickcheck
  const bogusParam = ['fake1', 'fake2'];
  const testBogusParam = function(param) {
    it('should throw a 409 for a bogus parameter', function() {
      return chakram.get(urlRoot + '?' + param + '=1')
      .then(expect409);
    });
  };

  bogusParam.forEach(testBogusParam);

  // options
  it('should allow GETs and POSTs on collections URLs', function() {
    const testOptions = function(resp) {
      expect(resp).to.have.header('allow', 'GET, POST');
      expect(resp).to.have.status(200);

    };

    return chakram.options(urlRoot).then(testOptions);
  });

  // options
  it('should allow GETs, PUTs, PATCHes and DELETEs on single URLs', function() {
    const testOptions = function(resp) {
      expect(resp).to.have.header('allow', 'GET, PUT, DELETE, PATCH');
      expect(resp).to.have.status(200);
    };

    return chakram.options(urlRoot + '/' + testPostData.testId).then(testOptions);
  });

  // bad methods
  const badCollectionMethods = ['put', 'patch', 'delete'];
  const testBadCollectionMethods = function(method) {
    it('should not allow PUTs, PATCHes and DELETEs on collection URLs', function() {
    const testOptions = function(resp) {
      expect(resp).to.have.status(404);
    };

    return chakram[method](urlRoot, {}).then(testOptions);
  });
  };

  badCollectionMethods.forEach(testBadCollectionMethods);

  // bad methods
  const badSingleMethods = ['post'];
  const testBadSingleMethods = function(method) {
    it('should not allow POSTs on single URLs', function() {
    const testOptions = function(resp) {
      expect(resp).to.have.status(404);
    };

    return chakram[method](urlRoot + '/' + testPostData.testId, {}).then(testOptions);
  });
  };

  badSingleMethods.forEach(testBadSingleMethods);

  // query for known values
  const exactMatchKeys =  [
    'testId',
    'testInt',
    'testFloat',
    'testString',
    'testUUID',
    'testEmail',
    'testDate',
    'testEnum',
    'testIntEnum',
    'testFloatEnum',
    'testMinMax',
  ];

  const testExactMatchKeys = function(key) {
    it('should load at least one document in which ' + key + ' equals ' + testPostData[key], function() {
    const testOptions = function(resp) {
      const expectIt = expect(resp);
      expectGenericSuccess(expectIt);
      expectGetSuccess(resp);
      expect(resp.body.meta.count).to.be.at.least(1);
    };

    return chakram.get(urlRoot + '?' + key + '=' + testPostData[key]).then(testOptions);
  });
  };

  exactMatchKeys.forEach(testExactMatchKeys);

  after('it should delete old entries', function() {
       var deleteEntry = function(elem) {
         const res = chakram.del(urlRoot + '/' + elem.testId);
         expect(res).to.have.status(200);
       };

       idArr.forEach(deleteEntry);
       return chakram.wait();
     });

});
