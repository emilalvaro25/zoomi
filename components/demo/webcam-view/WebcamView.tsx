/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import './WebcamView.css';
import cn from 'classnames';
import { useCameraState } from '@/lib/state';

export default function WebcamView() {
  const { videoRef, isLocalVideoActive, isScreenSharing } =
    useLiveAPIContext();
  const { effect } = useCameraState();

  return (
    <div className={cn('webcam-view', { 'video-enabled': isLocalVideoActive })}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn({
          [`effect-${effect}`]: effect !== 'none',
          'no-mirror': isScreenSharing,
        })}
      />
      {!isLocalVideoActive && (
        <div className="placeholder">
          <span className="icon">videocam_off</span>
          <p>Camera is off</p>
        </div>
      )}
    </div>
  );
}