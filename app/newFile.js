/**
 * @function
 * @return {Object} newObject
 */

const generateModel = function() {
  /**
   * model defind
   * @namespace
   * @typedef {object} model
   * @property {object} fitres - filtre
   * @property {string} fitres.hopitaux The hospitals
   * @property {string} fitres.maladie The maladie
   */

  const model = {
    'fitres': {
      'hopitaux': '',
      'maladie': null,
    },
  };

  const newJSON = {};
  for (let i = 1; i < 20; i++) {
    newJSON[i] = Object.assign({}, model);
    newJSON[i].model.hopitaux = Math.floor(Math.random() * 3);
    newJSON[i].model.maladie = Math.floor(Math.random() * 10);
  }
  console.log(newJSON);
};


/**
 * @function
 * @param {string} [url="http://localhost:3000/departement"] URL - url of api call B
 */

const createMode = function(url = 'http://localhost:3000/departement') {
  axios.get(url)
      .then((res) => {
        return res.data;
      });
};

createMode(342432414);
