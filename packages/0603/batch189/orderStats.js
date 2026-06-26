function buildUserOrderStatsPipeline(options = {}) {
  const { timezoneOffsetMs = 0, topN = 10, dateRange = null } = options;

  const pipeline = [];

  if (dateRange) {
    const matchStage = {
      $match: {
        createdAt: {
          $gte: dateRange.start,
          $lt: dateRange.end
        }
      }
    };
    pipeline.push(matchStage);
  }

  pipeline.push({
    $group: {
      _id: "$userId",
      totalAmount: { $sum: "$amount" },
      avgAmount: { $avg: "$amount" },
      orderCount: { $sum: 1 }
    }
  });

  pipeline.push({
    $sort: { totalAmount: -1 }
  });

  pipeline.push({
    $facet: {
      rankedUsers: [
        {
          $setWindowFields: {
            sortBy: { totalAmount: -1 },
            output: {
              rank: { $rank: {} }
            }
          }
        },
        {
          $match: { rank: { $lte: topN } }
        },
        {
          $addFields: {
            userId: "$_id"
          }
        },
        {
          $project: {
            _id: 0,
            userId: 1,
            totalAmount: 1,
            avgAmount: 1,
            orderCount: 1,
            rank: 1
          }
        }
      ],
      totalStats: [
        {
          $group: {
            _id: null,
            grandTotal: { $sum: "$totalAmount" },
            overallAvgPerUser: { $avg: "$totalAmount" },
            totalOrders: { $sum: "$orderCount" },
            userCount: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            grandTotal: 1,
            overallAvgPerUser: 1,
            totalOrders: 1,
            userCount: 1
          }
        }
      ]
    }
  });

  return pipeline;
}

function getLastMonthDateRange(timezoneOffsetMs = 0, now = new Date()) {
  const currentLocal = new Date(now.getTime() + timezoneOffsetMs);
  const year = currentLocal.getUTCFullYear();
  const month = currentLocal.getUTCMonth();

  const startOfLastMonthLocal = Date.UTC(year, month - 1, 1);
  const startOfCurrentMonthLocal = Date.UTC(year, month, 1);

  return {
    start: new Date(startOfLastMonthLocal - timezoneOffsetMs),
    end: new Date(startOfCurrentMonthLocal - timezoneOffsetMs)
  };
}

async function getUserOrderStats(collection, options = {}) {
  const pipeline = buildUserOrderStatsPipeline(options);
  const result = await collection.aggregate(pipeline).toArray();
  return result[0] || { rankedUsers: [], totalStats: [] };
}

module.exports = {
  buildUserOrderStatsPipeline,
  getLastMonthDateRange,
  getUserOrderStats
};
