package org.openmsupply.client;

import android.util.Base64;

public class ErrorPage {
    // the unhappy man svg and the text "Oops! Something's gone wrong"
    // Simple HTML to show the SVG and some text, centred on the page

    static String html = "<div\n" +
            "  style=\"\n" +
            "    align-items: center;\n" +
            "    display: flex;\n" +
            "    flex-direction: column;\n" +
            "    height: 100%;\n" +
            "    justify-content: center;\n" +
            "    width: 100%;\n" +
            "  \"\n" +
            ">\n" +
            "  <div>\n" +
            "    <div>\n" +
            "      <svg\n" +
            "        width=\"301\"\n" +
            "        height=\"300\"\n" +
            "        viewBox=\"0 0 301 300\"\n" +
            "        xmlns=\"http://www.w3.org/2000/svg\"\n" +
            "        xmlns:xlink=\"http://www.w3.org/1999/xlink\"\n" +
            "      >\n" +
            "        <title>Error illustration</title>\n" +
            "        <defs>\n" +
            "          <linearGradient x1=\"30.668%\" y1=\"40.384%\" x2=\"65.881%\" y2=\"53.418%\" id=\"prefix__c\">\n" +
            "            <stop stop-color=\"#E1E7EA\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#D0D6DC\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"31.432%\" y1=\"42.349%\" x2=\"72.312%\" y2=\"56.615%\" id=\"prefix__e\">\n" +
            "            <stop stop-color=\"#E1E7EA\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#D0D6DC\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"50%\" y1=\"45.808%\" x2=\"79.143%\" y2=\"65.232%\" id=\"prefix__f\">\n" +
            "            <stop stop-color=\"#FBFBFB\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#D9DFE3\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"25.16%\" y1=\"3.067%\" x2=\"49.928%\" y2=\"89.514%\" id=\"prefix__g\">\n" +
            "            <stop stop-color=\"#ECECEC\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#E1E7EA\" offset=\"71.754%\"></stop>\n" +
            "            <stop stop-color=\"#BCC3CA\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"29.489%\" y1=\"50%\" x2=\"100%\" y2=\"50%\" id=\"prefix__h\">\n" +
            "            <stop stop-color=\"#BAC6D2\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#7F8F9F\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"50%\" y1=\"50%\" x2=\"76.359%\" y2=\"71.293%\" id=\"prefix__i\">\n" +
            "            <stop stop-color=\"#E1E7EA\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#D0D6DC\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"73.341%\" y1=\"89.804%\" x2=\"23.909%\" y2=\"5.486%\" id=\"prefix__j\">\n" +
            "            <stop stop-color=\"#DAE2E6\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#E3EBEF\" offset=\"58%\"></stop>\n" +
            "            <stop stop-color=\"#EDF6F9\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"29.814%\" y1=\"47.36%\" x2=\"111.048%\" y2=\"50%\" id=\"prefix__k\">\n" +
            "            <stop stop-color=\"#C4CDD1\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#C6CFD3\" stop-opacity=\"0\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"50%\" y1=\"100%\" x2=\"50%\" y2=\"0%\" id=\"prefix__l\">\n" +
            "            <stop stop-color=\"#7A87AF\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#444F77\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"50%\" y1=\"100%\" x2=\"50%\" y2=\"0%\" id=\"prefix__m\">\n" +
            "            <stop stop-color=\"#7A87AF\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#444F77\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <linearGradient x1=\"18.13%\" y1=\"4.088%\" x2=\"74.703%\" y2=\"111.588%\" id=\"prefix__n\">\n" +
            "            <stop stop-color=\"#E5E9F0\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#D2DAE8\" offset=\"100%\"></stop>\n" +
            "          </linearGradient>\n" +
            "          <radialGradient\n" +
            "            cx=\"43.37%\"\n" +
            "            cy=\"34.68%\"\n" +
            "            fx=\"43.37%\"\n" +
            "            fy=\"34.68%\"\n" +
            "            r=\"58.142%\"\n" +
            "            gradientTransform=\"matrix(0 -1 .90933 0 .118 .78)\"\n" +
            "            id=\"prefix__b\"\n" +
            "          >\n" +
            "            <stop stop-color=\"#EBEDF0\" stop-opacity=\"0.24\" offset=\"0%\"></stop>\n" +
            "            <stop stop-color=\"#EBEDF0\" stop-opacity=\"0.846\" offset=\"53.678%\"></stop>\n" +
            "            <stop stop-color=\"#E0E4E7\" stop-opacity=\"0\" offset=\"100%\"></stop>\n" +
            "          </radialGradient>\n" +
            "          <path\n" +
            "            d=\"M297.818 86.074C305.031 71.728 284.416 0 141.479 0 38.307 0-9.046 58.71 1.423 88.465\"\n" +
            "            id=\"prefix__a\"\n" +
            "          ></path>\n" +
            "        </defs>\n" +
            "        <g fill=\"none\" fill-rule=\"evenodd\">\n" +
            "          <path d=\"M.469 0h299.063v300H.469z\"></path>\n" +
            "          <g transform=\"translate(.469 27.273)\">\n" +
            "            <g transform=\"translate(0 156.212)\">\n" +
            "              <mask id=\"prefix__d\" fill=\"#fff\"><use xlink:href=\"#prefix__a\"></use></mask>\n" +
            "              <use fill=\"url(#prefix__b)\" fill-rule=\"nonzero\" xlink:href=\"#prefix__a\"></use>\n" +
            "              <ellipse\n" +
            "                fill=\"url(#prefix__c)\"\n" +
            "                fill-rule=\"nonzero\"\n" +
            "                opacity=\"0.672\"\n" +
            "                mask=\"url(#prefix__d)\"\n" +
            "                cx=\"119.434\"\n" +
            "                cy=\"40.224\"\n" +
            "                rx=\"7.861\"\n" +
            "                ry=\"4.388\"\n" +
            "              ></ellipse>\n" +
            "              <ellipse\n" +
            "                fill=\"url(#prefix__e)\"\n" +
            "                fill-rule=\"nonzero\"\n" +
            "                opacity=\"0.73\"\n" +
            "                mask=\"url(#prefix__d)\"\n" +
            "                cx=\"199.666\"\n" +
            "                cy=\"33.525\"\n" +
            "                rx=\"12.403\"\n" +
            "                ry=\"6.845\"\n" +
            "              ></ellipse>\n" +
            "              <ellipse\n" +
            "                fill=\"url(#prefix__f)\"\n" +
            "                fill-rule=\"nonzero\"\n" +
            "                opacity=\"0.73\"\n" +
            "                mask=\"url(#prefix__d)\"\n" +
            "                cx=\"58.52\"\n" +
            "                cy=\"15.271\"\n" +
            "                rx=\"12.403\"\n" +
            "                ry=\"6.845\"\n" +
            "              ></ellipse>\n" +
            "            </g>\n" +
            "            <g opacity=\"0.321\" transform=\"translate(218.546 27.493)\" fill-rule=\"nonzero\">\n" +
            "              <ellipse\n" +
            "                fill=\"url(#prefix__g)\"\n" +
            "                cx=\"13.416\"\n" +
            "                cy=\"9.078\"\n" +
            "                rx=\"8.385\"\n" +
            "                ry=\"8.425\"\n" +
            "              ></ellipse>\n" +
            "              <path\n" +
            "                d=\"M6.385 4.741C2.828 5.493.493 6.768.495 8.218c.004 2.325 6.017 4.22 13.43 4.231 7.414.011 13.42-1.864 13.417-4.19-.002-1.463-2.806-2.49-6.419-3.25\"\n" +
            "                stroke=\"url(#prefix__h)\"\n" +
            "                stroke-width=\"5.888\"\n" +
            "                transform=\"rotate(20 13.919 8.595)\"\n" +
            "              ></path>\n" +
            "              <path\n" +
            "                d=\"M21.818 9.078c0-4.653-3.754-8.425-8.385-8.425-4.63 0-7.531 2.975-8.13 6.33 3.214 2.021 5.562 3.25 7.046 3.684.71.208 1.413.477 2.13.716a32.16 32.16 0 002.443.708c.565.14 1.34.357 2.064.492.953.178 1.808.258 1.875.258.118 0 .248-.53.515-1.148.178-.411.325-1.283.442-2.615z\"\n" +
            "                fill=\"url(#prefix__i)\"\n" +
            "              ></path>\n" +
            "            </g>\n" +
            "            <ellipse\n" +
            "              fill=\"url(#prefix__j)\"\n" +
            "              opacity=\"0.418\"\n" +
            "              cx=\"47.735\"\n" +
            "              cy=\"86.275\"\n" +
            "              rx=\"9.777\"\n" +
            "              ry=\"9.826\"\n" +
            "            ></ellipse>\n" +
            "            <ellipse\n" +
            "              fill=\"url(#prefix__k)\"\n" +
            "              fill-rule=\"nonzero\"\n" +
            "              opacity=\"0.5\"\n" +
            "              cx=\"153.557\"\n" +
            "              cy=\"170.084\"\n" +
            "              rx=\"29.331\"\n" +
            "              ry=\"8.092\"\n" +
            "            ></ellipse>\n" +
            "            <g fill-rule=\"nonzero\">\n" +
            "              <g transform=\"rotate(20 71.002 403.935)\">\n" +
            "                <path\n" +
            "                  d=\"M1.2 3.222h3.45v176.297a1.725 1.725 0 01-3.45 0V3.222z\"\n" +
            "                  fill=\"#D8D8D8\"\n" +
            "                ></path>\n" +
            "                <path\n" +
            "                  d=\"M1.15 3.325l19.62 4.69a72.666 72.666 0 0027.705 1.182c7.746-1.165 14.991 4.107 16.265 11.836l6.423 38.97a.97.97 0 01-1.762.696l-3.337-4.987a12.115 12.115 0 00-15.285-4.196l-3.407 1.625a31.605 31.605 0 01-25.98.557L1.15 45.087V3.325z\"\n" +
            "                  fill=\"#E57A77\"\n" +
            "                ></path>\n" +
            "                <path\n" +
            "                  d=\"M49.344 19.623a3.45 3.45 0 010 4.88l-8.199 8.199 8.2 8.2a3.45 3.45 0 11-4.88 4.88l-8.2-8.2-8.198 8.198a3.45 3.45 0 11-4.88-4.88l8.198-8.198-8.198-8.197a3.45 3.45 0 114.88-4.88l8.198 8.197 8.2-8.199a3.45 3.45 0 014.88 0z\"\n" +
            "                  fill=\"#FFF\"\n" +
            "                ></path>\n" +
            "                <ellipse fill=\"#D8D8D8\" cx=\"2.3\" cy=\"2.312\" rx=\"2.3\" ry=\"2.312\"></ellipse>\n" +
            "              </g>\n" +
            "              <path\n" +
            "                d=\"M105.132 102.531c1.15-.578 1.725-.77 1.725-.578v3.468l-1.15.578-.575-3.468z\"\n" +
            "                fill=\"#FFE9E9\"\n" +
            "              ></path>\n" +
            "            </g>\n" +
            "            <g fill-rule=\"nonzero\">\n" +
            "              <path\n" +
            "                d=\"M137.81 160.417c-.386-1.416-1.089-2.17-2.106-2.263-1.527-.138-5.827 4.434-6.725 6.321-.9 1.888 1.556 4.533 4.359 1.99 1.869-1.694 3.36-3.71 4.472-6.048z\"\n" +
            "                fill=\"#677285\"\n" +
            "              ></path>\n" +
            "              <path\n" +
            "                d=\"M11.757 15.031L9.221 7.919a1.38 1.38 0 00-2.492-.232L5.234 10.25c-.14 5.65.911 8.8 3.156 9.449 2.245.649 3.367-.907 3.367-4.668z\"\n" +
            "                fill=\"url(#prefix__l)\"\n" +
            "                transform=\"translate(127.85 151.588)\"\n" +
            "              ></path>\n" +
            "              <path\n" +
            "                d=\"M161.252 160.417c.387-1.416 1.09-2.17 2.107-2.263 1.526-.138 5.826 4.434 6.725 6.321.899 1.888-1.556 4.533-4.36 1.99-1.868-1.694-3.359-3.71-4.472-6.048z\"\n" +
            "                fill=\"#677285\"\n" +
            "              ></path>\n" +
            "              <path\n" +
            "                d=\"M11.757 10.638L9.221 3.527a1.38 1.38 0 00-2.492-.232L5.234 5.857c-.14 5.65.911 8.8 3.156 9.449 2.245.65 3.367-.907 3.367-4.668z\"\n" +
            "                fill=\"url(#prefix__l)\"\n" +
            "                transform=\"matrix(-1 0 0 1 171.213 155.981)\"\n" +
            "              ></path>\n" +
            "              <path\n" +
            "                d=\"M12.25.268c-.64 1.266-.961 2.344-.961 3.234-.962 2.165-2.547 5.078-5.291 11.155a4.268 4.268 0 006.603 5.051l8.815-7.262 8.684 7.206a4.327 4.327 0 005.553-.022 4.473 4.473 0 001.13-5.395c-1.233-2.504-2.836-6.082-4.812-10.733 0-.88-.28-1.743-.839-2.588L12.251.268z\"\n" +
            "                fill=\"url(#prefix__m)\"\n" +
            "                transform=\"translate(127.85 151.588)\"\n" +
            "              ></path>\n" +
            "            </g>\n" +
            "            <path\n" +
            "              d=\"M7.673 19.074c-1.046 1.535-1.43 4.222-1.15 8.062h4.601L9.348 39.133a1.83 1.83 0 001.17 1.983c4 1.494 7.215 2.313 9.647 2.457 2.423.144 5.824-.525 10.204-2.007a1.83 1.83 0 001.177-2.223c-.782-2.823-2.367-6.892-4.756-12.207-.64.752.848.752 4.463 0-.225-3.42-.8-6.107-1.725-8.062-.925-1.956-2.458-3.587-4.601-4.894L16.8 12.94c-2.25.441-3.95.97-5.1 1.586-1.726.924-2.458 2.244-4.027 4.548z\"\n" +
            "              fill=\"url(#prefix__n)\"\n" +
            "              fill-rule=\"nonzero\"\n" +
            "              transform=\"matrix(-1 0 0 1 168.707 117.757)\"\n" +
            "            ></path>\n" +
            "            <path\n" +
            "              d=\"M161.75 144.87l-.184 5.477-.617 2.741-4.247 17.608.677 1.469.438 1.907-.438 1.214-1.15-.431-2.3-1.88-.352-1.059a1.615 1.615 0 01.124-1.297l1.03-1.84 3.086-16.438-.31-7.265 4.242-.207zM137.569 145.076l.496 5.27.618 2.742 4.247 17.608-.677 1.469-.438 1.907.438 1.214 1.15-.431 2.3-1.88.351-1.059c.143-.43.098-.901-.123-1.297l-1.03-1.84-3.086-16.438.24-7.265h-4.486z\"\n" +
            "              fill=\"#FDE7E6\"\n" +
            "              fill-rule=\"nonzero\"\n" +
            "            ></path>\n" +
            "            <path\n" +
            "              d=\"M146.886 126.213h4.53v6.102l-.162.26c-1.704 2.714-2.556 3.792-2.556 3.232 0-.578-.604-1.742-1.812-3.492v-6.102z\"\n" +
            "              fill=\"#FECECD\"\n" +
            "              fill-rule=\"nonzero\"\n" +
            "            ></path>\n" +
            "            <path\n" +
            "              d=\"M149.048 131.213c1.607.082 3.856-3.005 3.856-6.01s-.839-6.011-3.856-6.011c-3.016 0-4.177 2.692-4.177 6.011 0 3.32 2.57 5.928 4.177 6.01z\"\n" +
            "              fill=\"#FFE9E9\"\n" +
            "              fill-rule=\"nonzero\"\n" +
            "            ></path>\n" +
            "            <path\n" +
            "              d=\"M144.479 126.205c.321-1.146.321-3.672.964-3.755.643-.082 1.928.396 3.213-.532.643-.51.964-.573.964-.83 3.213.61 1.292 2.45 2.892 4.477.111.141.326.141.643 0 0-3.327-.107-5.139-.322-5.436-.321-.445-1.606-2.238-2.249-.959 0-.64-1.285-1.3-2.57-.81-1.286.49-3.214 1.45-3.535 2.729-.321 1.279-.643 3.837 0 5.116z\"\n" +
            "              fill=\"#513450\"\n" +
            "            ></path>\n" +
            "          </g>\n" +
            "        </g>\n" +
            "      </svg>\n" +
            "    </div>\n" +
            "  </div>\n" +
            "  <div>\n" +
            "    <h5>Oops! Something's gone wrong.</h5>\n" +
            "  </div>\n" +
            "</div>\n";
    public static String encodedHtml = Base64.encodeToString(html.getBytes(), Base64.NO_PADDING);

}
