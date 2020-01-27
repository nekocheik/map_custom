import React,{ useState }  from 'react';
import './styles/style.scss';
import Datvis from './pluging/dataVis'
import axios from "axios";

function App() {

  const [data, setData] = useState([]);

  // axios.get('http://localhost:3000/departement')
  // .then((res) => {

  //   // console.log(res.data)
  // })

  // setData({})

  return (
    <div className="App2">
      <Datvis array={data} ></Datvis>
    </div>
  );
}

export default App;
