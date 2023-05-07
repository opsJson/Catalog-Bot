const {Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder} = require("discord.js");
const cheerio = require("cheerio");
const fetch = require("node-fetch");

const client = new Client({intents:[
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent
]});

const DiscordToken = "discord-token";
const catalog = [];
let channel;

client.on("ready", async () => {
	client.application.commands.create({
		name: "channel",
		description: "Sets Catalog Channel ID",
		options: [
		{
			name: "id",
			description: "Catalog Channel ID",
			type: 3,
			required: true
		}]
	});
	console.log("Catalog Bot online!");
	
	setInterval(run, 1000 * 60 * 60 * 1);
	run();
});

client.on("interactionCreate", (interaction) => {
	const ChannelID = interaction.options.getString("id").trim();
	channel = client.channels.cache.get(ChannelID);
	
	if (channel) {
		interaction.reply({
			content: `Catalog channel set to <#${ChannelID}>`,
			ephemeral: true
		});
	}
	else {
		interaction.reply({
			content: `Could not found channel "${ChannelID}"`,
			ephemeral: true
		});
	}
});

client.login(DiscordToken);

async function downloadImage(imageURL) {
	try {
		let file = await fetch(imageURL, {
			headers: {
				cookie: "mc=1"
			}
		});
		
		if (file.status != 200) return null;
		
		file = await file.buffer();
		
		return file;
	}
	catch (e) {
		return null;
	}
}

async function run() {
	if (!channel) return;
	
	let html;
	
	try {
		html = await fetch("https://1500chan.org/b/catalog.html", {
			headers: {
				cookie: "mc=1"
			}
		});
		
		html = await html.text();
	}
	catch (e) {
		return;
	}
	
	const $ = cheerio.load(html);
	let counter = 0;
	
	$(".mix").each(async (index, thread) => {
		if (counter >= 10) return;
		
		const url = "https://1500chan.org" + $(thread).find("a").attr("href");
		
		if (catalog.includes(url)) return;
		if (catalog.length > 100) catalog.unshift();
		catalog.push(url);
		counter++;
		
		const info = $(thread).find("strong").text().match(/(R: \d+ \/ I: \d+)/, "")[1];
		const body = $(thread).find(".replies").text().replace(/R: \d+ \/ I: \d+/, "").trim();
		
		let image = $(thread).find("img").attr("src");
		let file;
		
		if (image.indexOf("/b/thumb/") != -1) {
			image = "https://1500chan.org" + image;
			image = image.replace("thumb", "src");
			file = await downloadImage(image);
			
			if (!file) {
				image = image.replace("src", "thumb");
				file = await downloadImage(image);
			}
		}
		else {
			image = "https:" + image;
			file = await downloadImage(image);
		}
		
		const embed = new EmbedBuilder()
			.setURL(url)
			.setImage("attachment://image.png")
			.setTitle(info)
			.setDescription(body);
		
		channel.send({
			files: file ? [new AttachmentBuilder(file, {name: "image.png"})] : undefined,
			embeds: [embed]
		});
	});
}