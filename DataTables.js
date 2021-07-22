
/**
 * DATATABLES SERVERSIDE MODEL FOR JAVASCRIPT
 * 
 * I created this code for my personal use of datatables especially in nodejs projects.
 * This uses Sequelize's instance, and is required as a first parameter.
 * The second parameter is the postData that the DataTables.js is sending us from the client.
 * 
 * params:
 * instance - An Sequelize instance used for queries and db transactions.
 * postData - The data that the DataTables.js is sending to server.
 * 
 */

 module.exports = class datatable {

    staticWhere = null;
    staticOrder = null;
    aWhere = "";
    sLimit = "";
    selectFields;
    tableQuery;
    recordsTotal = 0;
    recordsFiltered = 0;

    constructor(instance, postData){
        this.instance = instance;
        this.postData = postData;
    }

    async getList(){
        // validation
        if (!this.selectFields || !this.tableQuery) {
            throw new Error('undefined select fields or table query');
        }

        // initial query
        let query = `SELECT ${this.selectFields.join(',')} FROM ${this.tableQuery}`;
        let [init, init_metadata] = await this.instance.query(query);
        this.recordsFiltered, this.recordsTotal = init.length;

        // filtering
        if (this.postData.search.value !== '') {
            let searchVal = this.postData.search.value;
            this.aWhere = " WHERE ";
            this.aWhere += this.selectFields.map(field => {
                return `${field} LIKE '%${searchVal}%'`;
            }).join(" OR ");
        }

        // individual column filtering
        this.postData.columns.forEach(column => {
            if (column.search.value !== '') {
                let searchVal = column.search.value;
                console.log(searchVal);
                if (this.aWhere === "") {
                    this.aWhere = " WHERE ";
                } else {
                    this.aWhere += " AND ";
                }

                this.aWhere += `${column.data} LIKE '%${searchVal}%'`;
            }
        });

        // appending where statement from filters
        if (this.staticWhere === null) {
            query += this.aWhere == ""? "": this.aWhere;
        } else {
            query += this.aWhere == ""? ` WHERE ${this.staticWhere}`:`${this.aWhere} AND ${this.staticWhere}`;
        }

        // ordering
        if (this.postData.order != null) {
            let postOrder = this.postData.order[0];
            let col = this.selectFields[postOrder.column];
            col = col.split(' ');
            col = col[0];
            let dir = postOrder.dir.toUpperCase();
            let order = " ORDER BY ";
            if (this.postData.columns[postOrder.column].orderable == 'true') {
                order += `${col} ${dir}`;
                query += order;
            }
        } else {
          let order = " ORDER BY ";
          if(this.staticOrder!=null){
            query += order + this.staticOrder;
          }
        }

        // filtered query count
        let [iFiltered, F_metadata] = await this.instance.query(query);
        this.recordsFiltered = iFiltered.length;

        // paging
        if (typeof this.postData.start !== undefined && typeof this.postData.length !== undefined && this.postData.length != '-1') {
            this.sLimit = ` LIMIT ${Number(this.postData.start)}, ${Number(this.postData.length)}`
            query += this.sLimit;
        }

        // main query
        let [result, metadata] = await this.instance.query(query);

        return result;
    }

    async output(){
        let output = {
            data: await this.getList(),
            recordsTotal: this.recordsTotal,
            recordsFiltered: this.recordsFiltered,
            draw: Number(this.postData.draw)
        }
        return output;
    }
}
