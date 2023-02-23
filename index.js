
const { Client } = require('pg')

class DatabaseQueryBuilderTable {
  constructor(...args) {
    this.columns = [];
    this.primaryKeys = [];
    this.foreignKeys = [];
  }
}
class DatabaseQueryBuilderForeignKey {
  constructor(nargs) {
    this.table_name             = nargs.table_name;
    this.column_name            = nargs.column_name;
    this.referenced_table_name  = nargs.referenced_table_name;
    this.referenced_column_name = nargs.referenced_column_name;
  }
}

class DatabaseQueryBuilder {
  constructor( tables ) {
    this.tables = tables;
  }
  static async investigateTables( context ) {
    const tables = {};
    function get_table(table_name) {
      let table = tables[table_name];
      if ( ! table ) {
        table = new DatabaseQueryBuilderTable();
        tables[table_name] = table;
      }
      return table
    }

    const client = new Client();
    try {
      await client.connect();

      {
        const result = await client.query( `
          select table_name, column_name, ordinal_position 
          from information_schema.columns
          where table_schema = current_schema()
          order by table_name, ordinal_position;
        `);
        const { rows }  = result;

        for ( const row of rows ) {
          const {
            table_name,
            column_name,
            ordinal_position,
          } = row;
          const table = get_table( table_name );
          table.columns.push( column_name );
        }
      }

      {
        const result = await client.query( `
          SELECT table_name, column_name
          FROM information_schema.table_constraints AS c
             JOIN information_schema.constraint_column_usage AS cc
               USING (table_schema, table_name, constraint_name)
          WHERE c.constraint_type = 'PRIMARY KEY'
          AND table_schema = current_schema()
          ORDER BY 1,2
        `);
        const { rows }  = result;

        for ( const row of rows ) {
          const {
            table_name,
            column_name,
          } = row;
          const table = get_table( table_name );
          table.primaryKeys.push( column_name );
          // console.log( {table_name, column_name} );
        }
      }

      {
        // https://stackoverflow.com/a/3907999/17858456
        const result = await client.query( `
          SELECT 
               kcu1.constraint_schema   AS fk_constraint_schema 
              ,kcu1.constraint_name     AS fk_constraint_name 
              ,kcu1.table_schema        AS fk_table_schema 
              ,kcu1.table_name          AS fk_table_name 
              ,kcu1.column_name         AS fk_column_name 
              ,kcu1.ordinal_position    AS fk_ordinal_position 
              ,kcu2.constraint_schema   AS referenced_constraint_schema 
              ,kcu2.constraint_name     AS referenced_constraint_name 
              ,kcu2.table_schema        AS referenced_table_schema 
              ,kcu2.table_name          AS referenced_table_name 
              ,kcu2.column_name         AS referenced_column_name 
              ,kcu2.ordinal_position    AS referenced_ordinal_position 

          FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS   AS rc

          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE    AS kcu1 
               ON kcu1.constraint_catalog = rc.CONSTRAINT_CATALOG  
              AND kcu1.constraint_schema  = rc.CONSTRAINT_SCHEMA 
              AND kcu1.constraint_name    = rc.CONSTRAINT_NAME 

          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE    AS kcu2
               ON kcu2.CONSTRAINT_CATALOG = rc.UNIQUE_CONSTRAINT_CATALOG
              AND kcu2.CONSTRAINT_SCHEMA  = rc.UNIQUE_CONSTRAINT_SCHEMA
              AND kcu2.CONSTRAINT_NAME    = rc.UNIQUE_CONSTRAINT_NAME
              AND kcu2.ORDINAL_POSITION   = kcu1.ORDINAL_POSITION
          WHERE
            kcu1.constraint_schema = current_schema()
        `);
        const { rows }  = result;

        for ( const row of rows ) {
          const {
            fk_table_name  : table_name,
            fk_column_name : column_name,
            referenced_table_name,
            referenced_column_name,
          } = row;
          const table = get_table( table_name );
          table.foreignKeys.push( 
            {
              table_name,
              column_name,
              referenced_table_name ,
              referenced_column_name ,
            }
          );
          // console.log( {table_name, column_name} );
        }
      }

      // console.dir( tables );
    } catch ( e ) {
      console.error(e);
    } finally {
      await client.end();
      //if ( context.isConntected() ) {
      //  await context.disconnect();
      //}
    }
    return tables;
  }
}

module.exports.DatabaseQueryBuilder = DatabaseQueryBuilder;

