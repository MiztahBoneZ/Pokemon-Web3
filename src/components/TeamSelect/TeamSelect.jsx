import React, { useEffect, useState } from "react";
import { auth, frdb } from "../../Core/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./TeamSelect.css";

export default function TeamSelect({
  onConfirm = () => {},
  onCancel = () => {},
}) {
  const [monList, setMonList] = useState([]);
  const [team, setTeam] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const snap = await getDocs(
          collection(frdb, "users", user.uid, "inventory")
        );

        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) =>
          (b.createdAt || "").localeCompare(a.createdAt || "")
        );
        setMonList(list);
      } catch (err) {
        console.error("Failed to load inventory:", err);
      }
    };

    fetchInventory();
  }, []);

  const toggleMon = (mon) => {
    const already = team.find((t) => t.id === mon.id);

    if (already) {
      setTeam(team.filter((t) => t.id !== mon.id));
      return;
    }

    if (team.length >= 6) return;
    setTeam([...team, mon]);
  };

  const typeColors = {
    normal: "#A8A878",
    fire: "#F08030",
    water: "#6890F0",
    electric: "#F8D030",
    grass: "#78C850",
    ice: "#98D8D8",
    fighting: "#C03028",
    poison: "#A040A0",
    ground: "#E0C068",
    flying: "#A890F0",
    psychic: "#F85888",
    bug: "#A8B820",
    rock: "#B8A038",
    ghost: "#705898",
    dragon: "#7038F8",
    dark: "#705848",
    steel: "#B8B8D0",
    fairy: "#EE99AC",
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000); // hide after 3s
  };

  const handleConfirm = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const activeRef = doc(frdb, "users", user.uid, "activeTeam", "team");

      await setDoc(activeRef, {
        slots: team.map((m) => m.id),
        updatedAt: serverTimestamp(),
      });

      showToast("Team updated!");
      onConfirm(team);
    } catch (err) {
      console.error("Failed to save active team:", err);
      showToast("Failed to save team!");
    }
  };

  return (
    <div className="team-select-container">
      <h2 className="team-title">Select Your Team</h2>

      <div className="team-bar">
        {team.map((m) => (
          <div className="team-slot-filled" key={m.id}>
            <img src={m.sprite} alt="" />
            <span className="team-slot-name">
              {m.nickname ? m.nickname.toUpperCase() : m.name.toUpperCase()}
            </span>
          </div>
        ))}
        {Array.from({ length: 6 - team.length }).map((_, i) => (
          <div className="team-slot-empty" key={`e-${i}`}></div>
        ))}
      </div>

      <div className="team-list">
        {monList.map((m) => {
          const selected = team.find((t) => t.id === m.id);
          return (
            <div
              key={m.id}
              className={`team-card ${selected ? "selected" : ""}`}
              onClick={() => toggleMon(m)}
              style={{
                borderColor: typeColors[m.types?.[0]] || "#666",
              }}
            >
              {m.onChain && <div className="nft-badge">NFT</div>}
              <img src={m.sprite} alt="" className="team-sprite" />
              <div className="team-info">
                <h4 className="team-name">
                  {m.nickname ? m.nickname.toUpperCase() : m.name.toUpperCase()}
                </h4>
                <div className="team-types">
                  {m.types?.map((t) => (
                    <span
                      className="type-pill"
                      key={t}
                      style={{ background: typeColors[t] }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {selected && <div className="team-check">✓</div>}
            </div>
          );
        })}
      </div>

      <div className="team-actions">
        <button
          className="team-btn confirm"
          disabled={team.length === 0}
          onClick={handleConfirm}
        >
          Confirm
        </button>
        <button className="team-btn cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {toastMessage && <div className="team-toast">{toastMessage}</div>}
    </div>
  );
}
