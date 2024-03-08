import { DataTypes } from 'sequelize';
import sequelize from './sequelize';


const IPInfo = sequelize.define('IPInfo', {
  ip: {
    type: DataTypes.CHAR(39),
    allowNull: false,
    primaryKey: true,
  },

  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
  },

  country: {
    type: DataTypes.CHAR(2),
    defaultValue: 'xx',
    allowNull: false,
  },

  cidr: {
    type: DataTypes.CHAR(43),
    defaultValue: 'N/A',
    allowNull: false,
  },

  org: {
    type: `${DataTypes.CHAR(60)} CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },

  descr: {
    type: `${DataTypes.CHAR(60)} CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },

  asn: {
    type: DataTypes.CHAR(12),
    defaultValue: 'N/A',
    allowNull: false,
  },

  proxy: {
    type: DataTypes.TINYINT,
    defaultValue: 0,
  },

  /*
   * extra information from
   * proxycheck
   */
  pcheck: {
    type: `${DataTypes.CHAR(60)} CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
}, {
  getterMethods: {
    isProxy() {
      return (this.proxy === 1);
    },
  },

  setterMethods: {
    isProxy(proxy) {
      const num = (proxy) ? 1 : 0;
      this.setDataValue('proxy', num);
    },

    asn(value) {
      const asn = value.split(',')[0];
      this.setDataValue('asn', asn);
    },

    org(value) {
      this.setDataValue('org', value.slice(0, 60));
    },

    descr(value) {
      this.setDataValue('descr', value.slice(0, 60));
    },

    pcheck(value) {
      if (value) {
        this.setDataValue('pcheck', value.slice(0, 60));
      }
    },

    country(value) {
      this.setDataValue('country', value.slice(0, 2).toLowerCase());
    },
  },
});

export async function getIPofIID(uuid) {
  if (!uuid) {
    return null;
  }
  let result = null;
  try {
    result = await IPInfo.findOne({
      attributes: ['ip'],
      where: { uuid },
      raw: true,
    });
  } catch {
    // nothing
  }
  return result && result.ip;
}

export async function getIIDofIP(ip) {
  if (!ip) {
    return null;
  }
  let result = null;
  try {
    result = await IPInfo.findByPk(ip, {
      attributes: ['uuid'],
      raw: true,
    });
  } catch {
    // nothing
  }
  return result && result.uuid;
}

export async function getIdsToIps(ips) {
  const ipToIdMap = new Map();
  if (!ips.length || ips.length > 300) {
    return ipToIdMap;
  }
  try {
    const result = await IPInfo.findAll({
      attributes: ['ip', 'uuid'],
      where: { ip: ips },
      raw: true,
    });
    result.forEach((obj) => {
      ipToIdMap.set(obj.ip, obj.uuid);
    });
  } catch {
    // nothing
  }
  return ipToIdMap;
}

export async function getInfoToIp(ip) {
  return IPInfo.findByPk(ip);
}

export async function getInfoToIps(ips) {
  const ipToIdMap = new Map();
  if (!ips.length || ips.length > 300) {
    return ipToIdMap;
  }
  try {
    const result = await IPInfo.findAll({
      attributes: ['ip', 'uuid', 'country', 'cidr', 'org', 'pcheck'],
      where: { ip: ips },
      raw: true,
    });
    result.forEach((obj) => {
      ipToIdMap.set(obj.ip, obj);
    });
  } catch {
    // nothing
  }
  return ipToIdMap;
}

export default IPInfo;
