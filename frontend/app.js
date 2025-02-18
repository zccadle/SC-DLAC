const web3 = new Web3(Web3.givenProvider || "http://localhost:8545");

const auditLogAddress = '0xf8e81D47203A594245E36C48e151709F0C19fBe8';
const patientDataStorageAddress = '0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B';
const simpleRBACAddress = '0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8';

const auditLogAbi = [/* ABI for AuditLog */];
const patientDataStorageAbi = [/* ABI for PatientDataStorage */];
const simpleRBACAbi = [/* ABI for SimpleRBAC */];

const auditLogContract = new web3.eth.Contract(auditLogAbi, auditLogAddress);
const patientDataStorageContract = new web3.eth.Contract(patientDataStorageAbi, patientDataStorageAddress);
const simpleRBACContract = new web3.eth.Contract(simpleRBACAbi, simpleRBACAddress);

// View access logs
async function viewAccessLog() {
    const logs = await auditLogContract.getPastEvents('AccessLogged', {
        fromBlock: 0,
        toBlock: 'latest'
    });
    document.getElementById("accessLog").innerHTML = JSON.stringify(logs, null, 2);
}

// Grant permission
async function grantPermission() {
    const address = document.getElementById("grantAddress").value;
    await simpleRBACContract.methods.grantPermission(address, "view_data").send({ from: web3.eth.defaultAccount });
    alert("Permission granted.");
}

// Revoke permission
async function revokePermission() {
    const address = document.getElementById("revokeAddress").value;
    await simpleRBACContract.methods.revokePermission(address, "view_data").send({ from: web3.eth.defaultAccount });
    alert("Permission revoked.");
}
