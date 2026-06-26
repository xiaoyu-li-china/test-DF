const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_DATE = '2026-06-15';
const CONCURRENT_REQUESTS = 10;

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runConcurrencyTest() {
  console.log('=== 并发测试开始 ===');
  console.log(`测试日期: ${TEST_DATE}`);
  console.log(`并发请求数: ${CONCURRENT_REQUESTS}`);
  console.log('');

  console.log('1. 查询初始空闲场地...');
  const initial = await makeRequest('GET', `/api/courts/available?date=${TEST_DATE}`);
  console.log(`   状态: ${initial.status}`);
  
  console.log('');
  console.log('2. 并发预订同一时段同一场地...');
  const bookingPromises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    bookingPromises.push(
      makeRequest('POST', '/api/bookings', {
        courtNumber: '1号',
        date: TEST_DATE,
        startHour: 10,
        memberPhone: `1380000000${i}`
      })
    );
  }
  
  const results = await Promise.allSettled(bookingPromises);
  const successCount = results.filter(r => r.value?.status === 201).length;
  const conflictCount = results.filter(r => r.value?.status === 409).length;
  const errorCount = results.filter(r => r.value?.status >= 500).length;
  
  console.log(`   成功: ${successCount}`);
  console.log(`   冲突: ${conflictCount}`);
  console.log(`   错误: ${errorCount}`);
  
  if (successCount > 1) {
    console.log('   ⚠️  问题发现: 同一时段同一场地被多次预订成功!');
  }

  console.log('');
  console.log('3. 再次查询空闲场地...');
  const afterBooking = await makeRequest('GET', `/api/courts/available?date=${TEST_DATE}`);
  console.log(`   状态: ${afterBooking.status}`);
  const court1 = afterBooking.data.courts?.find(c => c.courtNumber === '1号');
  console.log(`   1号场地 10 点是否空闲: ${court1?.availableHours?.includes(10) ? '是' : '否'}`);

  const bookingId = results.find(r => r.value?.status === 201)?.value?.data?.id;
  if (bookingId) {
    console.log('');
    console.log(`4. 取消预订 ID: ${bookingId}...`);
    const cancel = await makeRequest('DELETE', `/api/bookings/${bookingId}`);
    console.log(`   状态: ${cancel.status}`);

    console.log('');
    console.log('5. 取消后查询空闲场地...');
    const afterCancel = await makeRequest('GET', `/api/courts/available?date=${TEST_DATE}`);
    const court1After = afterCancel.data.courts?.find(c => c.courtNumber === '1号');
    const isAvailable = court1After?.availableHours?.includes(10);
    console.log(`   1号场地 10 点是否空闲: ${isAvailable ? '是' : '否'}`);
    if (!isAvailable) {
      console.log('   ⚠️  问题发现: 取消后仍显示占用!');
    }
  }

  console.log('');
  console.log('=== 测试完成 ===');
}

runConcurrencyTest().catch(console.error);
