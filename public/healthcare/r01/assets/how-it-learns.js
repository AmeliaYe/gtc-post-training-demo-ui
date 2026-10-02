import {createArchitecture} from './architecture-r04.js';

const workflow=createArchitecture();
workflow.setVisible(true);

function enterGallery(){
  workflow.pause();
  if(parent===window){location.assign('/');return;}
  parent.postMessage({type:'gtc-demo:enter-gallery'},location.origin);
}

document.querySelector('#enter-gallery').addEventListener('click',enterGallery);
document.querySelector('#heldout-gallery').addEventListener('click',enterGallery);
document.documentElement.dataset.howItLearnsReady='true';
