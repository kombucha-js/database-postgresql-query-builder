{
  const fs = require('fs');
  const path = require('path');
  const dotenv_file = path.resolve(process.cwd(), '.env');
  if ( ! fs.existsSync( dotenv_file ) ) {
    throw new Error( `.env file (${ dotenv_file }) is missing.` );
  }
  // require('dotenv').config();
  // MODIFIED (Wed, 27 Sep 2023 13:28:23 +0900)
  require('asynchronous-context/env').config();
}

Object.assign( require('util').inspect.defaultOptions, {
  depth  : null,
  colors : true,
  showHidden : false,
  maxStringLength : Infinity,
  compact: false,
  breakLength: 1000,
});

const util   = require( 'node:util' );
const assert = require( 'node:assert/strict' );
const { test, describe, it, before, after } = require( 'node:test' );
const { DatabaseQueryBuilder } = require('./index.js');


describe( '', async ()=>{
  await it('as', async ()=>{
    const tables = await DatabaseQueryBuilder.investigateTables();
    console.log( tables );
  });
});


