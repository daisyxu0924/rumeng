var consignee = "你的身份证名字" //输入你的观影人姓名
var consigneePhonr = "你的手机号" // 输入观影人手机号
var id = "你的观影人ID以5开头的" //不知道怎么拿ID的问Daisy
var day = 1

var projectId = ""
var productId = ""

var ticket

step0()
// step1()


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function step0() {
  try {
    console.log('如梦开始卖了吗...')
    var searchResponse = await fetch('https://platformpcgateway.polyt.cn/api/1.0/search/searchTheater', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        keyWords:"如梦之梦",
        requestModel:{"applicationSource":"plat_pc","current":1,"size":12,"applicationCode":"plat_pc"}
      }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8',
      }
    })
    search = await searchResponse.json()
    if (search.code === 200) {
      var records = search.data.records
      if (records.length > 0) {
        var record = records[0]
        projectId = record.projectId
        productId = record.productId
        console.log(`如梦ID在此，存起来: projectID: ${projectId} / productId: ${productId}`)
        step1()
      } else {
        throw new Error("还没开票")
      }
    } else {
      throw new Error(search.msg)
    }
  } catch (e) {
    console.log('如梦还没开始卖，重试此步骤', e)
    await delay(1000);
    step0()
  }
}

async function step1() {
  if (!projectId || !productId) {
    step0()
  }
  try {
    console.log('获取剧院信息...')
    var showResponse = await fetch('https://platformpcgateway.polyt.cn/api/1.0/show/getShowInfoDetail', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        productId,
        projectId,
        requestModel:{"applicationSource":"plat_pc","current":1,"size":10,"applicationCode":"plat_pc"}
      }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8',
      }
    })
    show = await showResponse.json()
    if (show.code == 200) {
      ticket = show.data.platShowInfoDetailVOList[day-1]
      console.log(`获取剧院信息成功，选定场次：${ticket.showTime}`)
      step2(show)
    } else {
      throw new Error(show.msg)
    }
  } catch (e) {
    console.log('获取剧院信息失败，重试此步骤', e)
    await delay(1000);
    step1()
  }
}

async function step2(show) {
  try {
    console.log('获取座位信息...')

    var showId = ticket.showId
    var sectionId = ticket.sectionId
    var seatResponse = await fetch('https://platformpcgateway.polyt.cn/api/1.0/seat/getSeatInfo', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        projectId,
        sectionId,
        showId,
        requestModel:{"current":1,"size":10}
      }),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      }
    })
    var seats = await seatResponse.json()
    if (seats.code == 200) {
      console.log('获取座位成功...')
      step3(seats)
    } else {
      throw new Error(seats.msg)
    }
  } catch (e) {
    console.log('获取座位失败，重试此步骤', e)
    await delay(1000);
    step2(show)
  }
}

async function step3(seats) {
  try {
    var productId = seats.data.productId
    var available = seats.data.seatList.filter(s => s.statusStr === "未售")
    var priceList = seats.data.priceGradeList
    var showTime = ticket.showTime
    var showId = ticket.showId

    if (available.length === 0) {
      console.log('没有座位了，哭吧')
      return
    }

    var random = Math.floor(Math.random() * (Math.ceil(Math.min(50, available.length))))
    console.log(`还有${available.length}个座位，选取了第${random}个`)
    var pick = available[random]
    var price = priceList.find(p => p.ticketPriceId === pick.pid)
    console.log(`尝试购买座位${pick.site} - ￥${price.price}...`)

    var commitResponse = await fetch('https://platformpcgateway.polyt.cn/api/1.0/platformOrder/commitOrderOnSeat', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        priceList: [{"count":1,"priceId":pick.pid,"seat":pick.sid,"freeTicketCount":1}],
        projectId: productId,
        showId,
        showTime,
        requestModel:{applicationCode: "plat_pc",
        applicationSource: "plat_pc",
        current: 1,
        size: 10},
        seriesId: ""
      }),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      }
    })
    var commit = await commitResponse.json()
    if (commit.code === 200 && commit.success) {
      var url = `https://www.polyt.cn/order/create?uuid=${commit.data}&showId=${showId}`
      console.log('尝试购买座位成功，点击此链接可进行手动付款', url)
      step4(commit)
    } else {
      throw new Error(commit.msg)
    }
  } catch (e) {
    console.log('尝试购买座位失败，重试此步骤', e)
    await delay(1000);
    step3(seats)
  }
}

async function step4(commit) {
  try {
    if (commit == null) return
    console.log('尝试下单中...')
    var uuid = commit.data
    var orderResponse = await fetch('https://platformpcgateway.polyt.cn/api/1.0/platformOrder/createOrder', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        channelId:null,
        consignee,
        consigneePhonr,
        deliveryWay:"01",
        payWayCode:"06",
        movieIds: id,
        seriesId:"",
        orderFreightAmt:0,
        uuid,
        requestModel:{"applicationSource":"plat_pc","current":1,"size":10,"applicationCode":"plat_pc"}}),
        headers: {
          'Content-type': 'application/json; charset=UTF-8'
        }
    })
    var order = await orderResponse.json()
    if (order.code == 200) {
      var orderId = order.data.id
      var finalUrl = `https://www.polyt.cn/pay?orderId=${orderId}&payWayCode=06`
      console.log(`下单成功！快点打开链接用你的微信支付: ${finalUrl}`)
    } else {
      throw new Error(order.msg)
    }
  } catch (e) {
    console.log('尝试下单，重试此步骤', e)
    await delay(1000);
    step4(commit)
  }
}
