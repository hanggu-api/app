import axios from "axios";

async function checkHealth() {
  try {
    console.log("Checking https://cardapyia.com/api/health ...");
    const res = await axios.get("https://cardapyia.com/api/health");
    console.log("Status:", res.status);
    console.log("Data:", res.data);
  } catch (e: any) {
    console.log("Error:", e.message);
    if (e.response) {
      console.log("Response Status:", e.response.status);
      console.log("Response Data:", e.response.data);
    }
  }
}

checkHealth();
