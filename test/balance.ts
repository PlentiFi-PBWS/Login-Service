

async function test(){
  const apiResponse = await fetch("http://localhost:3002/xrpBalance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ xrplAddress: "rKVHjUaJ5fy4hybBLbsrBMQ1LhxLW6KGJo" }),
  });

  const jsonResponse = await apiResponse.json();
  console.log("xrpl balance: ", jsonResponse);
}

test().then(() => {
  console.log("done");
});