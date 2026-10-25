export const obsSettings=Object.freeze({width:1280,height:720,fps:30,videoKbps:2500,audioKbps:128,keyframeSeconds:2,sampleRate:48000});
export function obsSenderProfile(tatami){
 if(!Number.isInteger(tatami)||tatami<1||tatami>5)throw Error('Tatami 1 bis 5 wählen');
 return `[General]\nName=SDM Tatami ${tatami}\n\n[Output]\nMode=Simple\nReconnect=true\nRetryDelay=2\nMaxRetries=25\n\n[SimpleOutput]\nVBitrate=2500\nABitrate=128\nStreamEncoder=x264\nPreset=veryfast\nUseAdvanced=true\nx264Settings=keyint=60 min-keyint=60 scenecut=0\nRecQuality=Stream\nRecFormat2=mkv\n\n[Video]\nBaseCX=1280\nBaseCY=720\nOutputCX=1280\nOutputCY=720\nFPSType=0\nFPSCommon=30\nScaleType=bicubic\n\n[Audio]\nSampleRate=48000\nChannelSetup=Stereo\n`;
}
