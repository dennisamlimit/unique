import React, { useState } from "react";
import "./inventory.css";
import { DEFAULT_CHARACTER_NAME, DEFAULT_STATS, DEFAULT_WEIGHT } from "./inventoryConfig";
import { InventoryLayout } from "./InventoryComponents";
import { moveInventoryItem } from "./inventoryUtils";
import { useInventoryBridge } from "./useInventoryBridge";

const InventoryApp = () => {
  const [visible, setVisible] = useState(false);
  const [charName, setCharName] = useState(DEFAULT_CHARACTER_NAME);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [inventory, setInventory] = useState([]);
  const [weight, setWeight] = useState(DEFAULT_WEIGHT);

  const requestCloseInventory = () => {
    setVisible(false);
    if (window.mp) {
      window.mp.trigger("client:inventory:close");
    }
  };

  useInventoryBridge({
    onRequestClose: requestCloseInventory,
    visible,
    setVisible,
    setCharName,
    setStats,
    setInventory,
    setWeight,
  });

  const useItem = (item) => {
    if (window.mp) {
      window.mp.trigger("client:inventory:useItem", item.uid);
    }
  };

  const moveItem = (uid, targetSlot) => {
    setInventory((currentInventory) => moveInventoryItem(currentInventory, uid, targetSlot));

    if (window.mp) {
      window.mp.trigger("client:inventory:moveItem", uid, targetSlot);
    }
  };

  return (
    <InventoryLayout
      visible={visible}
      charName={charName}
      stats={stats}
      inventory={inventory}
      weight={weight}
      onClose={requestCloseInventory}
      onUseItem={useItem}
      onMoveItem={moveItem}
    />
  );
};

export default InventoryApp;
