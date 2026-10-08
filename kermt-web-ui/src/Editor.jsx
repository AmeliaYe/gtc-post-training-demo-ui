/** Ketcher owns drawing and stereochemistry; RDKit validates the exported molecule. */
import React from 'react';
import {Editor} from 'ketcher-react';
import {StandaloneStructServiceProvider} from 'ketcher-standalone';
import 'ketcher-react/dist/index.css';
const provider = new StandaloneStructServiceProvider();
export default function MoleculeEditor({onInit}) {
  return <Editor staticResourcesUrl="/" structServiceProvider={provider}
    disableMacromoleculesEditor onInit={onInit}/>;
}
