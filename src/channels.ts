export interface SyncStateChannelOptions {
  name: string;
  baseChannel?: string;
}

export interface SyncStateChannels {
  getChannel: string;
  setChannel: string;
  subscribeChannel: string;
  unsubscribeChannel: string;
  updateChannel: string;
}

export const createSyncStateChannels = (options: SyncStateChannelOptions): SyncStateChannels => {
  const baseChannel = options.baseChannel ?? "state";
  const channelPrefix = `${baseChannel}:${options.name}`;

  return {
    getChannel: `${channelPrefix}:get`,
    setChannel: `${channelPrefix}:set`,
    subscribeChannel: `${channelPrefix}:subscribe`,
    unsubscribeChannel: `${channelPrefix}:unsubscribe`,
    updateChannel: `${channelPrefix}:update`,
  };
};
