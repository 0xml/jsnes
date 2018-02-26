
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

class Loader {
  static loadCart(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  //Private

  userHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  }

  romsPath() {
    return getUserHome() + '/Desktop/roms';
  }
}

class INESHeaderParser {
  constructor(romData) {
    this.romData = romData;
  }

  parse(data) {
    console.log(data.length);

    return new Promise((resolve, reject) => {

      // First 4 bytes should be equal to 'NES\x1a' 
      var iNesHeader = data.slice(0, 4);
      if (iNesHeader.equals(Buffer.from('5E45531A', 'hex')) === false) {
        const err = Error('Wrong header format, should have \'NES\x1a\' in front');
        reject(err);
      } 

      var progROM = data.readInt8(4);
      var chrROM = data.readInt8(5);

      var prgSize = progROM * 16384; // 0x4000 * header bytes
      var chrSize = chrROM * 8192; // 0x2000 * header bytes

      var mirroring = ((data.readInt8(6) & 1) !== 0 ? 1 : 0);
      var batteryRam = (data.readInt8(6) & 2) !== 0;
      var trainer = (data.readInt8(6) & 4) !== 0;
      var mapperType = (data.readInt8(6) >> 4) | (data.readInt8(6) & 0xF0);

      var padding = 16;
      if (trainer) {
        padding += 512;
      }

      var prg = Buffer.allocUnsafe(prgSize);
      var chr = Buffer.allocUnsafe(chrSize);

      for (let i = 0; i < prgSize; i++) {
        prg[i] = data[padding + i];
      }

      for (let i = 0; i < chrSize; i++) {
        chr[i] = data[padding + prgSize + i];
      }

      console.log(data.toString('hex'));
      console.log('--------');
      console.log(prg.toString('hex'));
      console.log('--------');
      console.log(chr.toString('hex'));

      //var c = new Cartridge(prg, chr, mapper, mirror, battery);
      return null;
    });


  }

  /*
  checksum() {

    function loadNesFile(path) {
      fs.readFile(path, (err, data) => {

      });
    }

    console.log(getRomsPath());
    let path = getRomsPath();

    function checksum(str, algorithm, encoding) {
      return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex');
    }

    fs.readdir(path, (err, files) => {
      console.log(files);
      var hash = crypto.createHash('MD5');
      var filePath = path + '/' + files[0];
      console.log(filePath);
      var s = fs.createReadStream(filePath);
      s.on('data', function(d) {
        console.log(d);
        hash.update(d);
      });
      s.on('end', function() {
        var d = hash.digest('hex');
        console.log(d + '  ' + filePath);
        console.log(d);
      });

      fs.readFile(filePath, function(err, data) {
        checksum(data); // e53815e8c095e270c6560be1bb76a65d
        console.log(checksum(data));
        checksum(data, 'sha1'); // cd5855be428295a3cc1793d6e80ce47562d23def
      });

      loadNesFile(filePath);

// document.body.innerHTML = "<p>"+files+"</p>"

    });
  }
  */
}

class Cartridge {
  constructor(prg, chr, mapper, mirror, battery) {
    this.prg = prg;
    this.chr = chr;
    this.mapper = mapper;
    this.mirror = mirror;
    this.battery = battery;
  }
}

module.exports = {
  Loader: Loader,
  INESHeaderParser: INESHeaderParser,
  Cartridge: Cartridge
};

