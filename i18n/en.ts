import type { CoreTranslations } from "./types";

export const coreEn: Pick<CoreTranslations, "account"> = {
  account: {
    title: "Account Settings",
    firstName: "First name / Nickname",
    lastName: "Last name",
    mahjongsoulId: "Mahjong Soul ID",
    riichiCityId: "Riichi City ID",
    mahjongsoulIdDesc:
      'Your Mahjong Soul ID can be found in the "Friends" screen of the game.',
    riichiCityIdDesc:
      "Enter your Riichi City user ID. The username will be filled automatically later when a recorded game provides it.",
    accountIdLabel: "ID",
    usernameLabel: "Username",
    save: "Save",
    saved: "Settings saved!",
    saveError: "Failed to save settings.",
    notLoggedIn: "You must be logged in to access account settings.",
    setupPrompt:
      "Please fill in your name so other members can recognize you on the session schedule.",
    linkedAccounts: "Linked Accounts",
    linkAccount: "Link Account",
    notLinked: "Not linked",
    linkMahjongsoul: "Link Mahjong Soul Account",
    linkRiichiCity: "Link Riichi City Account",
    mahjongsoulIdRequired: "Friend ID is required",
    riichiCityIdRequired: "User ID is required",
    confirmLink:
      "Click the button below to permanently link this account. This action cannot be undone.",
    linked: "Account linked successfully!",
    discordAccount: "Discord",
    discordLinked: "Discord account linked successfully!",
    discordLinkError: "Failed to link Discord account.",
    preferences: "Preferences",
    tileStyle: "Tile style",
    tileStyleDesc: "Choose how mahjong tiles are displayed across the site.",
    preferencesSaved: "Preferences saved!",
    preferencesSaveError: "Failed to save preferences.",
  },
};
