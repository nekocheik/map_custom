import React from "react";
import Map from './mapSvg'

export default function dataVis(filre) {
  // setInterval(() => {
  //   console.log(filre)
  // }, 1000);
  return <div>
    <Map></Map>
    {filre.array}
  </div>;
}
