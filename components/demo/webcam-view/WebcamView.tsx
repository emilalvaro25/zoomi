/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import './WebcamView.css';
import cn from 'classnames';
import { useCameraState } from '@/lib/state';

export default function WebcamView() {
  const { videoRef, videoEnabled } = useLiveAPIContext();
  const { zoom, effect } = useCameraState();

  return (
    <div className={cn('webcam-view', { 'video-enabled': videoEnabled })}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ transform: `scale(${zoom})` }}
        className={cn({ [`effect-${effect}`]: effect !== 'none' })}
      />
      {!videoEnabled && (
        <div className="placeholder">
          <span className="icon">videocam_off</span>
          <p>Camera is off</p>
        </div>
      )}
    </div>
  );
}