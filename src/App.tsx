/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameScene } from './components/GameScene';
import { Overlay } from './components/Overlay';

export default function App() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-black font-sans">
      <GameScene />
      <Overlay />
    </div>
  );
}
