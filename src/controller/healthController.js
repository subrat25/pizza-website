const { getDBConnectionStatus } = require("../dba/mapper/dbMapper");

const getHealth = (req, res) => {
  res.status(200).json({
    status: "Ok - Server is running",
  });
};

const getHealth2 = async (req, res) => {
  const upTime = process.uptime();
    const formattedUptime = upTime > 3600
          ? `${Math.floor(upTime / 3600)}h ${Math.floor((upTime % 3600) / 60)}m ${Math.floor(upTime % 60)}s`
          : upTime > 60
          ? `${Math.floor(upTime / 60)}m ${Math.floor(upTime % 60)}s`
          : `${Math.floor(upTime)}s`;
  try {
    const dbStatus = await getDBConnectionStatus(); 
    res.status(200).json({
      status: "ok",
      uptime: formattedUptime,   
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      uptime: formattedUptime,
      message: "Failed to fetch DB status",
      error: error.message,
    });
  }
};

module.exports = {
  getHealth,
  getHealth2,
};