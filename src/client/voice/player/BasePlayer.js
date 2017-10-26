const EventEmitter = require('events').EventEmitter;
const prism = require('prism-media');
const StreamDispatcher = require('../dispatcher/StreamDispatcher');

const FFMPEG_ARGUMENTS = [
  '-analyzeduration', '0',
  '-loglevel', '0',
  '-f', 's16le',
  '-ar', '48000',
  '-ac', '2',
];

/**
 * An Audio Player for a Voice Connection.
 * @private
 * @extends {EventEmitter}
 */
class BasePlayer extends EventEmitter {
  constructor(voiceConnection) {
    super();

    this.dispatcher = null;

    this.streamingData = {
      channels: 2,
      sequence: 0,
      timestamp: 0,
    };
  }

  destroy() {
    this.destroyDispatcher();
  }

  destroyDispatcher() {
    if (this.dispatcher) {
      this.dispatcher.destroy();
      this.dispatcher = null;
    }
  }

  playUnknownStream(stream, options) {
    this.destroyDispatcher();
    const ffmpeg = new prism.FFmpeg({ args: FFMPEG_ARGUMENTS });
    stream.pipe(ffmpeg);
    return this.playPCMStream(ffmpeg, options, { ffmpeg });
  }

  playPCMStream(stream, options, streams = {}) {
    this.destroyDispatcher();
    const opus = streams.opus = new prism.opus.Encoder({ channels: 2, rate: 48000, frameSize: 960 });
    if (options && options.volume === false) {
      stream.pipe(opus);
      return this.playOpusStream(opus, options, streams);
    }
    const volume = streams.volume = new prism.VolumeTransformer16LE(null, { volume: options ? options.volume : 1 });
    stream.pipe(volume).pipe(opus);
    return this.playOpusStream(opus, options, streams);
  }

  playOpusStream(stream, options, streams = {}) {
    this.destroyDispatcher();
    streams.opus = stream;
    const dispatcher = this.createDispatcher(options, streams);
    stream.pipe(dispatcher);
    return dispatcher;
  }

  createDispatcher(options, streams, broadcast) {
    this.destroyDispatcher();
    const dispatcher = this.dispatcher = new StreamDispatcher(this, options, streams, broadcast);
    return dispatcher;
  }
}

module.exports = BasePlayer;