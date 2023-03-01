#!/usr/bin/env node

{
  const fs = require('fs');
  const path = require('path');
  const dotenv_file = path.resolve(process.cwd(), '.env');
  if ( ! fs.existsSync( dotenv_file ) ) {
    throw new Error( `.env file (${ dotenv_file }) is missing.` );
  }
  require('dotenv').config();
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
const { DatabaseQueryBuilder } = require( '../index.js' );

async function main() {
  const tables = await DatabaseQueryBuilder.investigateTables();
  const argv = [...process.argv].slice(2);

  if ( argv.length === 0 ) {
    console.error( '%s [table][...]', process.argv[1]  );
  } else {
    for ( const i of argv ){
      if ( i in tables ) {
        console.log( create_crud( tables[i] ) );
      } else {
        console.error( '%s is not found' , i );
      }
    }
  }
}

function create_crud( table ) {

  // Determine fill size.
  let max_length = 0;
  for ( const column_name of table.column_name_list ) {
    if ( max_length < column_name.length ) {
      max_length = column_name.length;
    }
  }
  const make_fill = (name,ratio=1)=>{
    const fill_size = max_length-name.length;
    const fill =' '.repeat(fill_size*ratio);
    return fill;
  }


  // Create 'create_or_update' sql part
  const output =[];
  output.push( `#params:nargs` );
  output.push( `INSERT INTO ${table.table_name} (` );
  {
    let comma = ' ';
    for ( const column_name of table.column_name_list ) {
      const fill = make_fill( column_name );
      output.push( `  <% if ( '${column_name}' ${ fill } in nargs ) { %>${comma}${column_name}${fill} <% } %>` );
      comma=',';
    }
  }
  output.push( `) VALUES (` );
  {
    let comma = ' ';
    for ( const column_name of table.column_name_list ) {
      const fill = make_fill( column_name );
      output.push( `  <% if ( '${column_name}' ${fill} in nargs ) { %>${comma}$${column_name}${fill} <% } %>` );
      comma=',';
    }
  }
  output.push( `)` );
  output.push( `ON CONFLICT ( ${table.primary_keys.join(',')} ) DO UPDATE SET` );

  {
    let comma = ' ';
    for ( const column_name of table.column_name_list ) {
      if ( table.primary_keys.includes( column_name ) ) {
        continue;
      }
      const fill = make_fill( column_name );
      const fill2 = make_fill( column_name,2 );
      output.push( `  <% if ( '${column_name}' ${fill} in nargs ) { %>${comma}${column_name}${fill}  = $${column_name} ${fill} <% } %>` );
      comma=',';
    }
  }
  // Create a condition of where clause.
  const condition = table.primary_keys.map( e=>{
    const fill = make_fill( e );
    return `${e}${fill} = $${e}${fill}`
  }).join('\n      AND ');


  return (`
KernelContext.defineMethod( async function create_or_update_${table.table_name}(nargs){
  const SQL_TEXT = sqlmacro\`
${output.map(e=>'    '+e).join('\n')}
  \`;
  const res = await this.query( SQL_TEXT(nargs), nargs );
  return res.rows;
} , METHOD_POST, AUTO_CONNECTION );

KernelContext.defineMethod( async function read_${table.table_name}( nargs ) {
  const SQL_TEXT = sqlmacro\`
    #params:nargs
    SELECT * FROM ${table.table_name}
    WHERE ${condition}
  \`;
  const res = await this.query( SQL_TEXT(nargs), nargs );
  return res.singleRow();
} , METHOD_POST, AUTO_CONNECTION );


KernelContext.defineMethod( async function delete_${table.table_name}( nargs ) {
  const SQL_TEXT = sqlmacro\`
    #params:nargs
    DELETE FROM ${table.table_name}
    WHERE ${condition}
  \`;
  const res = await this.query( SQL_TEXT(nargs), nargs );
  return res.singleRow();
} , METHOD_POST, AUTO_CONNECTION );
  `);
}

if ( require.main === module ) {
  main();
}



