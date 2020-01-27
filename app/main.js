const axios = require('axios');

/**
 * wirte a new file json config config for
 * @function
 */

const wirteJsonFile = function( data) {
  // fs.writeSync('./db.json', data);
};

const sortArrayByDepartement = function(data) {
  return data.sort((a, b) => parseFloat(a.total) - parseFloat(b.total)).reverse();
};

/**
 * gener a array at fonction model
 * @param {object} model - model
 * @return {array} array white a model
 */

const genArray = function( model ) {
  const array = [];

  for (let i = 1; i < 21; i++) {
    array[i] = Object.assign({}, model);
    for (const key in model) {
      const regex = new RegExp(/(\${(.+)})/);
      const varible = eval(model[key].match(regex)[2]);
      array[i][key] = model[key].replace( regex, varible);
    }
  }
  return array;
};

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
    'hopitaux': '${Math.floor(Math.random() * Math.floor(3))}',
    'maladie': '${Math.floor(Math.random() * 10)}',
    'total': '${ array[i].hopitaux + array[i].maladie }',
    'name': '${i}_departement',
    'number': '${i}',
  };

  let newJSON = genArray(model);

  console.log(JSON.stringify(newJSON));

  newJSON = sortArrayByDepartement(newJSON);

  const array = [[], [], []];

  for (let i = 0; i < array.length; i++) {
    for (let j = Math.floor(20/3) * i; j < Math.floor((20/3) * (i + 1)); j++) {
      array[i].push(newJSON[j+1]);
    }
  }

  console.log(array, newJSON);
  return array;
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


const orderByTotal = generateModel();

const mapSvgElements = document.querySelector('.map__svg');

// console.log(mapSvg);


const updateViewdepartemt = function(departement) {
  const graphes = document.querySelector('.graphes');
  const name = graphes.querySelector('h1');
  const backgroundNumber = graphes.querySelector('.background__number span');

  backgroundNumber.innerHTML = departement.number;
  name.innerHTML = `Paris, ${departement.number}th`;
  console.log(departement);
  // departement.forEach(element => {

  // });
};
const genClass = function( departementGroup ) {
  const classList = [
    'many', // 0
    'middle', // 1
    'Few', // 2
  ];

  departementGroup.forEach(( departements, i ) => {
    departements.forEach((departement) => {
      const elementDepartement = document.body.getElementsByClassName(departement.name)[0];
      elementDepartement.classList.add(classList[i]);
      elementDepartement.addEventListener(('mouseenter'), ()=>{
        mapSvgElements.append(elementDepartement);
      });
      elementDepartement.addEventListener(('click'), ()=>{
        updateViewdepartemt(departement);
      });
      // console.log( `.${departement.name}`, elementDepartement);
    });
  });
};

genClass(orderByTotal)
;
