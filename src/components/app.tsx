import React, { FunctionComponent, useMemo } from 'react';
import styled from 'styled-components';
import Selector from './selector';

import {
    ZakekeEnvironment, 
    ZakekeViewer, 
    ZakekeProvider, 
    loadProduct,
    Product
} from "zakeke-configurator-react";

const MyConfigurator = () => {
  const [environment, setEnvironment] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const modelCode = params.get("modelCode");

    if (!token || !modelCode) return;

    const init = async () => {
      const env = await loadProduct({
        tokenOauth: token,
        productId: Number(modelCode)
      });
      setEnvironment(env);
    };

    init();
  }, []);

  if (!environment) return <div>Loading...</div>;


const Layout = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 40px;
    height: 100%;
    padding: 40px;
`
console.log("Product", Product)


// const zakekeEnvironment = new ZakekeEnvironment();

const App: FunctionComponent<{}> = () => {

    // useEffect(() => {
    //     function handleAddToCartRequest(compositionId: string, previewUrl: string, quantity: number) {
    //         // Replace with your own logic to POST this info to your backend
    //         console.log("compositionId:", compositionId);
    //         console.log("previewUrl:", previewUrl);
    //         console.log("quantity:", quantity);


    //     }

    //     function messageListener(event: MessageEvent) {
    //         console.log("Message Received", event, MessageEvent)
    //         if (event.data?.zakekeMessageType === "AddToCart") {
    //             const { composition, preview, quantity } = event.data.message;
    //             handleAddToCartRequest(composition, preview, quantity);
    //         }
    //     }

    //     window.addEventListener("message", messageListener);

    //     // Cleanup
    //     return () => {
    //         window.removeEventListener("message", messageListener);
    //     };
    // }, []);

    // function handleAddToCartRequest(compositionId, previewUrl, quantity) {
    //     console.log("compositionId", compositionId)
    //     console.log("previewUrl", previewUrl)
    //     console.log("quantity", quantity)
    // }

    return (
        <ZakekeProvider environment={zakekeEnvironment}>
            <Layout>
                <Selector />
                <div><ZakekeViewer /></div>
            </Layout>
        </ZakekeProvider>
    );
}

export default App;















// import React, { FunctionComponent, useEffect } from 'react';
// import styled from 'styled-components';
// import { ZakekeEnvironment, ZakekeViewer, ZakekeProvider } from 'zakeke-configurator-react';
// import Selector from './selector';


// const Layout = styled.div`
//     display: grid;
//     grid-template-columns: 1fr 1fr;
//     grid-gap: 40px;
//     height: 100%;
//     padding: 40px;
// `

// const zakekeEnvironment = new ZakekeEnvironment();

// const App: FunctionComponent<{}> = () => {
//     return <ZakekeProvider environment={zakekeEnvironment}>
//         <Layout>
//             <Selector />
//             <div><ZakekeViewer /></div>
//         </Layout>
//     </ZakekeProvider>;

// }

// export default App; 


