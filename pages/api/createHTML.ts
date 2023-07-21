import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import fs from "fs";
import { NFTStorage, File, Blob } from "nft.storage";
import { JSDOM } from "jsdom";

const isLocal = process.env.IS_LOCAL === "true";

type Data = {
  success: boolean;
  cid: string | null;
};

async function createFileFromUrl(url: string, name: string) {
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  const file = new File([data], name, {
    type: response.headers.get("Content-Type") || "",
  });
  return file;
}

async function uploadImageToIPFS(
  url: string,
  client: NFTStorage
): Promise<string> {
  const file = await createFileFromUrl(url, url.split("/").pop() || "image");
  const cid = await client.storeBlob(file);
  const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
  return ipfsUrl;
}

function removeClass(dom: any, className: string, keepData: string[] = []) {
  const elements = dom.window.document.querySelectorAll(
    `div[class*="${className}"]`
  );
  elements.forEach(
    (element: { innerHTML: string | string[]; remove: () => void }) => {
      let shouldRemove = true;
      for (let data of keepData) {
        if (element.innerHTML.includes(data)) {
          shouldRemove = false;
          break;
        }
      }
      if (shouldRemove) {
        element.remove();
      }
    }
  );
}

// function removeElementByClassName(dom, className) {
//   const elements = dom.window.document.getElementsByClassName(className);
//   for(let i = elements.length - 1; i >= 0; i--) {
//     const element = elements[i];
//     element.parentNode.removeChild(element);
//   }
// }


function removeTag(dom: any, tagName: string) {
  const elements = dom.window.document.getElementsByTagName(tagName);
  for (let i = elements.length - 1; i >= 0; i--) {
    elements[i].parentNode.removeChild(elements[i]);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "POST") {
    const { url } = JSON.parse(req.body);

    if (!url) {
      res.status(200).json({
        success: false,
        cid: null,
      });
      return;
    }

    try {
      const response = await fetch(url);
      const html = await response.text();
      const dom = new JSDOM(html);

      const currentYear = new Date().getFullYear().toString();
      const authorElement = dom.window.document.querySelector('a[class*="frontend-pencraft-Text-module__decoration-hover-underline--BEYAn"]');
      const authorName: string = authorElement?.textContent ? authorElement.textContent : "Unknown";
      // Remove unnecessary classes
      removeClass(dom, "main-menu");
      removeClass(dom, "topbar-spacer");
      removeClass(dom, "subscribe-footer");
      removeClass(dom, "footer-wrap");
      removeClass(dom, "subscription-widget-wrap");
      removeClass(dom, "comments-section");
      removeClass(dom, "post-ufi");

      // removeElementByClassName(dom, "footer themed-background");

      removeClass(dom, "navbar-buttons");

      removeClass(dom, "pencraft", [authorName, currentYear, "<img"]);

      // Remove script and iframe tags
      removeTag(dom, "script");
      removeTag(dom, "iframe");

      const images = Array.from(dom.window.document.querySelectorAll("img"));

      const client = new NFTStorage({
        token: process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN || "",
      });

      for (const image of images) {
        const src = image.getAttribute("src");
        if (src && src.startsWith("http")) {
          const ipfsUrl = await uploadImageToIPFS(src, client);
          image.setAttribute("src", ipfsUrl);
        }
      }

      const htmlContent = dom.serialize();

      const fileName = url.split("/").pop() || "index";

      // write to file for create tool updload
      if (isLocal) {
        fs.writeFileSync(`./public/articles/${fileName}.html`, htmlContent);
      }

      const htmlBlob = new Blob([htmlContent], {
        type: "text/html;charset=utf-8",
      });

      const htmlCid = await client.storeBlob(htmlBlob);

      console.log("HTML CID", htmlCid.toString());

      console.log("DONE");

      res.status(200).json({
        success: true,
        cid: htmlCid, // replace this with the actual cid if you upload the content
      });
    } catch (error) {
      console.error(error);
      res.status(200).json({
        success: false,
        cid: null,
      });
    }
  } else {
    res.status(200).json({
      success: false,
      cid: null,
    });
  }
}
